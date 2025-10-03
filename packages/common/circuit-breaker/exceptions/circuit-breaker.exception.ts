import { CircuitBreakerState } from '../enums/circuit-breaker-state.enum';

/**
 * Circuit Breaker Exception
 * 
 * Thrown when a request is rejected due to an open circuit breaker
 */
export class CircuitBreakerException extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly state: CircuitBreakerState,
    message?: string,
  ) {
    super(message || `Circuit breaker '${circuitName}' is in ${state} state`);
    this.name = 'CircuitBreakerException';
  }
}