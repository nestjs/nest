/**
 * Circuit Breaker Configuration Interface
 * 
 * Defines all configurable options for circuit breaker behavior
 */
export interface CircuitBreakerOptions {
  /**
   * The name/identifier for this circuit breaker instance
   */
  name?: string;

  /**
   * Number of failures required to open the circuit
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Number of successful calls required to close the circuit from half-open state
   * @default 3
   */
  successThreshold?: number;

  /**
   * Time window in milliseconds for counting failures
   * @default 60000 (1 minute)
   */
  timeWindow?: number;

  /**
   * Time in milliseconds to wait before transitioning from open to half-open
   * @default 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Maximum number of concurrent requests allowed in half-open state
   * @default 1
   */
  halfOpenMaxCalls?: number;

  /**
   * Custom function to determine if an error should count as a failure
   * @param error - The error that occurred
   * @returns true if the error should count as a failure
   */
  isFailure?: (error: any) => boolean;

  /**
   * Function called when circuit breaker state changes
   */
  onStateChange?: (state: string, prevState: string) => void;

  /**
   * Function called when circuit breaker opens
   */
  onOpen?: () => void;

  /**
   * Function called when circuit breaker closes
   */
  onClose?: () => void;

  /**
   * Function called when request is rejected due to open circuit
   */
  onReject?: () => void;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: Required<CircuitBreakerOptions> = {
  name: 'default',
  failureThreshold: 5,
  successThreshold: 3,
  timeWindow: 60000, // 1 minute
  timeout: 60000, // 1 minute
  halfOpenMaxCalls: 1,
  isFailure: () => true,
  onStateChange: () => {},
  onOpen: () => {},
  onClose: () => {},
  onReject: () => {},
};