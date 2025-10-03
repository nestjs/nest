/**
 * Circuit Breaker Metrics Interface
 * 
 * Provides statistical information about circuit breaker performance
 */
export interface CircuitBreakerMetrics {
  /**
   * Current state of the circuit breaker
   */
  state: string;

  /**
   * Total number of calls made through the circuit breaker
   */
  totalCalls: number;

  /**
   * Number of successful calls
   */
  successfulCalls: number;

  /**
   * Number of failed calls
   */
  failedCalls: number;

  /**
   * Number of calls rejected due to open circuit
   */
  rejectedCalls: number;

  /**
   * Current failure rate as a percentage (0-100)
   */
  failureRate: number;

  /**
   * Average response time in milliseconds
   */
  averageResponseTime: number;

  /**
   * Timestamp of the last state change
   */
  lastStateChange: Date;

  /**
   * Time when the circuit was last opened
   */
  lastOpenTime?: Date;

  /**
   * Time when the circuit was last closed
   */
  lastCloseTime?: Date;
}