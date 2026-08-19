export type ErrorKind = 'network' | 'rate_limit' | 'auth' | 'bad_request' | 'syntax' | 'unknown';

export interface ApiErrorClassification {
  kind: ErrorKind;
  retryable: boolean;
  retryAfterMs?: number;
}

export function classifyApiError(error: any): ApiErrorClassification {
  const msg = error.message?.toLowerCase() || error.toString().toLowerCase();
  const status = error.status || error.code;

  if (msg.includes('syntaxerror') || msg.includes('unexpected token') || msg.includes('json') || msg.includes('schema')) {
    return { kind: 'syntax', retryable: true };
  }

  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 422) {
    return { kind: status === 401 || status === 403 ? 'auth' : 'bad_request', retryable: false };
  }

  const isNetworkOrRateLimit = status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
                               msg.includes('timeout') || msg.includes('quota') || msg.includes('fetch failed') || 
                               msg.includes('network') || msg.includes('econnreset') || msg.includes('enetunreach');

  if (isNetworkOrRateLimit) {
    let retryAfterMs: number | undefined = undefined;
    if (error.headers && error.headers['retry-after']) {
      const ra = parseInt(error.headers['retry-after']);
      if (!isNaN(ra)) retryAfterMs = ra * 1000;
    }
    return { kind: status === 429 ? 'rate_limit' : 'network', retryable: true, retryAfterMs };
  }

  return { kind: 'unknown', retryable: false };
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  public state: CircuitState = 'CLOSED';
  public failureTimestamps: number[] = [];
  private nextAttemptAt = 0;

  constructor(
    public readonly name: string,
    public readonly threshold = 5,
    public readonly minCooldownMs = 30000,
    public readonly maxCooldownMs = 300000,
    public readonly windowMs = 60000
  ) {}

  public recordFailure(retryAfterMs?: number) {
    const now = Date.now();
    this.failureTimestamps.push(now);
    
    // Evict old failures outside the window
    const windowStart = now - this.windowMs;
    this.failureTimestamps = this.failureTimestamps.filter(t => t > windowStart);
    
    if (this.failureTimestamps.length >= this.threshold) {
      this.state = 'OPEN';
      let cooldown = Math.max(this.minCooldownMs, retryAfterMs || 0);
      cooldown = Math.min(cooldown, this.maxCooldownMs);
      this.nextAttemptAt = now + cooldown;
      
      console.log(JSON.stringify({
        event: 'circuit_state_change',
        provider: this.name,
        state: 'OPEN',
        reason: 'threshold_reached',
        cooldown_ms: cooldown
      }));
    } else if (this.state === 'HALF_OPEN') {
      // If we failed during HALF_OPEN probe, immediately reopen
      this.state = 'OPEN';
      let cooldown = Math.max(this.minCooldownMs, retryAfterMs || 0);
      cooldown = Math.min(cooldown, this.maxCooldownMs);
      this.nextAttemptAt = Date.now() + cooldown;
      
      console.log(JSON.stringify({
        event: 'circuit_state_change',
        provider: this.name,
        state: 'OPEN',
        reason: 'probe_failed',
        cooldown_ms: cooldown
      }));
    }
  }

  public recordSuccess() {
    this.failureTimestamps = [];
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      console.log(JSON.stringify({
        event: 'circuit_state_change',
        provider: this.name,
        state: 'CLOSED',
        reason: 'probe_success'
      }));
    }
  }

  public async awaitIfOpen(): Promise<void> {
    while (true) {
      if (this.state === 'CLOSED') return;
      
      if (this.state === 'OPEN') {
        const now = Date.now();
        if (now >= this.nextAttemptAt) {
          this.state = 'HALF_OPEN';
          console.log(JSON.stringify({
            event: 'circuit_state_change',
            provider: this.name,
            state: 'HALF_OPEN',
            reason: 'cooldown_expired'
          }));
          return;
        } else {
          // Wait a bit and check again
          await new Promise(r => setTimeout(r, 1000));
        }
      } else if (this.state === 'HALF_OPEN') {
        // Only ONE probe allowed in HALF_OPEN. 
        // Other concurrent requests must wait until it returns to CLOSED or OPEN.
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
}

export class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: (() => void)[] = [];

  constructor(public maxConcurrent: number) {}

  public async acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return;
    }
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  public release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next && next();
    } else {
      this.activeCount--;
    }
  }
}

export async function withRetry<T>(
  operation: string,
  provider: string,
  breaker: CircuitBreaker | null,
  maxRetries: number,
  baseDelayMs: number,
  task: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  
  while (true) {
    if (breaker) {
      await breaker.awaitIfOpen();
    }
    
    try {
      const result = await task();
      if (breaker) breaker.recordSuccess();
      return result;
    } catch (error: any) {
      const classification = classifyApiError(error);
      
      // Output Repair / Syntax errors do not trip the network circuit breaker
      if (breaker && classification.retryable && classification.kind !== 'syntax') {
        breaker.recordFailure(classification.retryAfterMs);
      }
      
      if (!classification.retryable || attempt >= maxRetries) {
        throw error;
      }
      
      attempt++;
      let waitTime = baseDelayMs * Math.pow(2, attempt - 1);
      if (classification.retryAfterMs) {
        waitTime = Math.max(waitTime, classification.retryAfterMs);
      }
      const jitter = Math.random() * 1000;
      waitTime += jitter;

      console.log(JSON.stringify({
        event: 'api_retry',
        provider,
        operation,
        attempt,
        max_attempts: maxRetries,
        error: classification.kind,
        status: error.status || error.code || 'unknown',
        delay_ms: Math.round(waitTime),
        circuit_state: breaker?.state || 'N/A',
        message: error.message
      }));

      await new Promise(r => setTimeout(r, waitTime));
    }
  }
}
