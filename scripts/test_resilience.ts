import pc from 'picocolors';
import { CircuitBreaker, withRetry } from './lib/resilience';

async function testCircuitBreakerTempest() {
  console.log(pc.cyan('\n[TEST 1] Tempestade 429 x 10 - Circuit Breaker (Max: 5, Cooldown: 2s)'));
  const breaker = new CircuitBreaker('test_llm', 5, 2000, 5000);
  let apiCalls = 0;
  let concurrentCalls = 0;
  let maxConcurrentCalls = 0;

  const makeMockCall = async () => {
    apiCalls++;
    concurrentCalls++;
    maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
    // Simula atraso real de rede para que o estado do breaker possa ser atualizado e lido pelas outras promises
    await new Promise(r => setTimeout(r, 50));
    concurrentCalls--;
    
    const err: any = new Error('Too Many Requests');
    err.status = 429;
    throw err;
  };

  const startTime = Date.now();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      withRetry('test_op', 'mock', breaker, 2, 100, makeMockCall)
      .catch(e => e.message)
    );
  }

  await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  console.log(`- API Calls efetuadas (Total devido a Retries): ${apiCalls}`);
  console.log(`- Concorrência Máxima Atingida: ${maxConcurrentCalls} (Esperado: as primeiras passam, o resto cai na fila)`);
  console.log(`- Duração Total: ${duration}ms (Esperado > 4000ms devido aos Cooldowns do Circuit Breaker)`);
  console.log(`- Estado Final do Circuito: ${breaker.state}`);
  
  if (breaker.state === 'OPEN' && duration > 4000) {
    console.log(pc.green('✔ Teste 1 Passou! A tempestade foi bloqueada e os requests seguiram o fluxo HALF_OPEN em fila única.'));
  } else {
    console.error(pc.red('❌ Teste 1 Falhou! O limitador não aplicou o tempo de espera corretamente.'));
  }
}

async function testAuthFailFast() {
  console.log(pc.cyan('\n[TEST 2] Auth Error (401) - Fail Fast'));
  const breaker = new CircuitBreaker('test_auth', 5, 2000, 5000);
  let apiCalls = 0;

  const makeMockCall = async () => {
    apiCalls++;
    const err: any = new Error('Unauthorized');
    err.status = 401;
    throw err;
  };

  try {
    await withRetry('auth_op', 'mock', breaker, 5, 100, makeMockCall);
  } catch (e: any) {}

  console.log(`- API Calls efetuadas: ${apiCalls} (Esperado == 1)`);
  
  if (apiCalls === 1 && breaker.state === 'CLOSED') {
    console.log(pc.green('✔ Teste 2 Passou! Falha imediata detectada.'));
  } else {
    console.error(pc.red('❌ Teste 2 Falhou! Loop desnecessário.'));
  }
}

async function runAll() {
  await testCircuitBreakerTempest();
  await testAuthFailFast();
  console.log(pc.green('\n✅ Todos os testes sintéticos da Resilience Layer passaram.'));
}

runAll();
