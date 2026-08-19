export interface PIIResult {
  detected: boolean;
  entities: Array<{
    type: string;
    start: number;
    end: number;
  }>;
}

export interface PIIDetector {
  detect(content: string): PIIResult;
}

export class NoopPIIDetector implements PIIDetector {
  detect(content: string): PIIResult {
    return {
      detected: false,
      entities: []
    };
  }
}
