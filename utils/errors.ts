/**
 * Classes base para padronização de erros no Mentis.
 */

export class AppError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'APP_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AI_SERVICE_ERROR', details);
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'STORAGE_ERROR', details);
  }
}
