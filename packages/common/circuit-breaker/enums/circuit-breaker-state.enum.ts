/**
 * Circuit Breaker State Enumeration
 * 
 * Represents the three possible states of a circuit breaker:
 * - CLOSED: Normal operation, requests are allowed through
 * - OPEN: Circuit is open, requests are blocked and fail fast
 * - HALF_OPEN: Testing state, limited requests allowed to test service recovery
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}