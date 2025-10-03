import { Injectable } from '../../decorators/core/injectable.decorator';
import { Logger } from '../../services/logger.service';
import { CircuitBreakerState } from '../enums/circuit-breaker-state.enum';
import { CircuitBreakerException } from '../exceptions/circuit-breaker.exception';
import {
  CircuitBreakerOptions,
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
} from '../interfaces/circuit-breaker-options.interface';
import { CircuitBreakerMetrics } from '../interfaces/circuit-breaker-metrics.interface';

/**
 * Internal state tracking for a circuit breaker instance
 */
interface CircuitBreakerState_Internal {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextRetryTime: number;
  halfOpenCallCount: number;
  requestCount: number;
  totalResponseTime: number;
  rejectedCount: number;
  lastStateChangeTime: number;
  lastOpenTime?: number;
  lastCloseTime?: number;
}

/**
 * Circuit Breaker Service
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * by monitoring service health and automatically failing fast when services are unhealthy
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerState_Internal>();
  private readonly options = new Map<string, Required<CircuitBreakerOptions>>();

  /**
   * Creates or retrieves a circuit breaker with the given name and options
   */
  public getCircuit(name: string, options: CircuitBreakerOptions = {}): string {
    if (!this.circuits.has(name)) {
      this.initializeCircuit(name, options);
    }
    return name;
  }

  /**
   * Executes a function with circuit breaker protection
   */
  public async execute<T>(
    circuitName: string,
    fn: () => Promise<T> | T,
    options: CircuitBreakerOptions = {},
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(circuitName, options);
    const circuitOptions = this.options.get(circuitName)!;

    // Check if we should allow this call
    if (!this.shouldAllowCall(circuitName)) {
      this.recordRejection(circuitName);
      throw new CircuitBreakerException(circuitName, circuit.state);
    }

    const startTime = Date.now();
    
    try {
      // Execute the function
      const result = await Promise.resolve(fn());
      
      // Record success
      this.recordSuccess(circuitName, Date.now() - startTime);
      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(circuitName, error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Gets current metrics for a circuit breaker
   */
  public getMetrics(circuitName: string): CircuitBreakerMetrics | null {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return null;
    }

    const totalCalls = circuit.requestCount;
    const failureRate = totalCalls > 0 ? (circuit.failureCount / totalCalls) * 100 : 0;
    const averageResponseTime = totalCalls > 0 ? circuit.totalResponseTime / totalCalls : 0;

    return {
      state: circuit.state,
      totalCalls,
      successfulCalls: circuit.successCount,
      failedCalls: circuit.failureCount,
      rejectedCalls: circuit.rejectedCount,
      failureRate,
      averageResponseTime,
      lastStateChange: new Date(circuit.lastStateChangeTime),
      lastOpenTime: circuit.lastOpenTime ? new Date(circuit.lastOpenTime) : undefined,
      lastCloseTime: circuit.lastCloseTime ? new Date(circuit.lastCloseTime) : undefined,
    };
  }

  /**
   * Gets metrics for all circuit breakers
   */
  public getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name] of this.circuits) {
      const circuitMetrics = this.getMetrics(name);
      if (circuitMetrics) {
        metrics[name] = circuitMetrics;
      }
    }
    
    return metrics;
  }

  /**
   * Manually opens a circuit breaker
   */
  public openCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit && circuit.state !== CircuitBreakerState.OPEN) {
      this.changeState(circuitName, CircuitBreakerState.OPEN);
    }
  }

  /**
   * Manually closes a circuit breaker
   */
  public closeCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit && circuit.state !== CircuitBreakerState.CLOSED) {
      this.changeState(circuitName, CircuitBreakerState.CLOSED);
      circuit.failureCount = 0;
      circuit.successCount = 0;
    }
  }

  /**
   * Resets a circuit breaker to its initial state
   */
  public resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitBreakerState.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.halfOpenCallCount = 0;
      circuit.lastFailureTime = 0;
      circuit.lastSuccessTime = 0;
      circuit.nextRetryTime = 0;
      circuit.lastStateChangeTime = Date.now();
    }
  }

  private initializeCircuit(name: string, options: CircuitBreakerOptions): void {
    const mergedOptions = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options, name };
    this.options.set(name, mergedOptions);

    const circuit: CircuitBreakerState_Internal = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      nextRetryTime: 0,
      halfOpenCallCount: 0,
      requestCount: 0,
      totalResponseTime: 0,
      rejectedCount: 0,
      lastStateChangeTime: Date.now(),
    };

    this.circuits.set(name, circuit);
    this.logger.log(`Circuit breaker '${name}' initialized`);
  }

  private getOrCreateCircuit(name: string, options: CircuitBreakerOptions): CircuitBreakerState_Internal {
    if (!this.circuits.has(name)) {
      this.initializeCircuit(name, options);
    }
    return this.circuits.get(name)!;
  }

  private shouldAllowCall(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName)!;
    const options = this.options.get(circuitName)!;
    const now = Date.now();

    switch (circuit.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (now >= circuit.nextRetryTime) {
          this.changeState(circuitName, CircuitBreakerState.HALF_OPEN);
          circuit.halfOpenCallCount = 0;
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return circuit.halfOpenCallCount < options.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  private recordSuccess(circuitName: string, responseTime: number): void {
    const circuit = this.circuits.get(circuitName)!;
    const options = this.options.get(circuitName)!;

    circuit.successCount++;
    circuit.requestCount++;
    circuit.totalResponseTime += responseTime;
    circuit.lastSuccessTime = Date.now();

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      circuit.halfOpenCallCount++;
      
      if (circuit.successCount >= options.successThreshold) {
        this.changeState(circuitName, CircuitBreakerState.CLOSED);
        circuit.failureCount = 0;
        circuit.successCount = 0;
      }
    }
  }

  private recordFailure(circuitName: string, error: any, responseTime: number): void {
    const circuit = this.circuits.get(circuitName)!;
    const options = this.options.get(circuitName)!;

    // Check if this error should count as a failure
    const isFailure = options.isFailure ? options.isFailure(error) : true;
    
    if (!isFailure) {
      circuit.requestCount++;
      circuit.totalResponseTime += responseTime;
      return;
    }

    circuit.failureCount++;
    circuit.requestCount++;
    circuit.totalResponseTime += responseTime;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state should open the circuit
      this.changeState(circuitName, CircuitBreakerState.OPEN);
    } else if (circuit.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit(circuitName)) {
        this.changeState(circuitName, CircuitBreakerState.OPEN);
      }
    }
  }

  private recordRejection(circuitName: string): void {
    const circuit = this.circuits.get(circuitName)!;
    const options = this.options.get(circuitName)!;
    
    circuit.rejectedCount++;
    
    if (options.onReject) {
      options.onReject();
    }
  }

  private shouldOpenCircuit(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName)!;
    const options = this.options.get(circuitName)!;
    const now = Date.now();

    // Check failure threshold
    if (circuit.failureCount >= options.failureThreshold) {
      // Check if failures occurred within the time window
      const timeWindowStart = now - options.timeWindow;
      if (circuit.lastFailureTime >= timeWindowStart) {
        return true;
      }
    }

    return false;
  }

  private changeState(circuitName: string, newState: CircuitBreakerState): void {
    const circuit = this.circuits.get(circuitName)!;
    const options = this.options.get(circuitName)!;
    const oldState = circuit.state;

    if (oldState === newState) {
      return;
    }

    circuit.state = newState;
    circuit.lastStateChangeTime = Date.now();

    if (newState === CircuitBreakerState.OPEN) {
      circuit.nextRetryTime = Date.now() + options.timeout;
      circuit.lastOpenTime = Date.now();
      
      if (options.onOpen) {
        options.onOpen();
      }
    } else if (newState === CircuitBreakerState.CLOSED) {
      circuit.lastCloseTime = Date.now();
      
      if (options.onClose) {
        options.onClose();
      }
    }

    if (options.onStateChange) {
      options.onStateChange(newState, oldState);
    }

    this.logger.log(`Circuit breaker '${circuitName}' state changed from ${oldState} to ${newState}`);
  }
}