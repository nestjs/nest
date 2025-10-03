import { Injectable } from '../../decorators/core/injectable.decorator';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { CircuitBreakerState } from '../enums/circuit-breaker-state.enum';

/**
 * Health Check Indicator for Circuit Breakers
 * 
 * Provides health status information for all circuit breakers
 */
@Injectable()
export class CircuitBreakerHealthIndicator {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  /**
   * Check health status of all circuit breakers
   */
  async checkCircuitBreakers(key: string = 'circuit-breakers'): Promise<any> {
    const metrics = this.circuitBreakerService.getAllMetrics();
    const circuitNames = Object.keys(metrics);

    if (circuitNames.length === 0) {
      return {
        [key]: {
          status: 'up',
          message: 'No circuit breakers configured',
        },
      };
    }

    const healthyCircuits: string[] = [];
    const unhealthyCircuits: string[] = [];
    const totalMetrics = {
      totalCircuits: circuitNames.length,
      openCircuits: 0,
      halfOpenCircuits: 0,
      closedCircuits: 0,
      totalCalls: 0,
      totalFailures: 0,
      totalRejections: 0,
      averageFailureRate: 0,
    };

    // Analyze each circuit breaker
    for (const [name, metric] of Object.entries(metrics)) {
      totalMetrics.totalCalls += metric.totalCalls;
      totalMetrics.totalFailures += metric.failedCalls;
      totalMetrics.totalRejections += metric.rejectedCalls;

      switch (metric.state) {
        case CircuitBreakerState.OPEN:
          totalMetrics.openCircuits++;
          unhealthyCircuits.push(name);
          break;
        case CircuitBreakerState.HALF_OPEN:
          totalMetrics.halfOpenCircuits++;
          // Half-open is considered transitional, not unhealthy
          break;
        case CircuitBreakerState.CLOSED:
          totalMetrics.closedCircuits++;
          // Consider circuits with high failure rates as potentially unhealthy
          if (metric.failureRate > 50) {
            unhealthyCircuits.push(name);
          } else {
            healthyCircuits.push(name);
          }
          break;
      }
    }

    // Calculate average failure rate
    if (totalMetrics.totalCalls > 0) {
      totalMetrics.averageFailureRate = (totalMetrics.totalFailures / totalMetrics.totalCalls) * 100;
    }

    // Determine overall health status
    const isHealthy = unhealthyCircuits.length === 0 && totalMetrics.averageFailureRate < 50;

    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        message: isHealthy 
          ? 'All circuit breakers are healthy' 
          : `${unhealthyCircuits.length} circuit breaker(s) are unhealthy`,
        details: {
          healthy: healthyCircuits,
          unhealthy: unhealthyCircuits,
          metrics: totalMetrics,
          circuits: metrics,
        },
      },
    };
  }

  /**
   * Check health status of a specific circuit breaker
   */
  async checkCircuitBreaker(circuitName: string, key?: string): Promise<any> {
    const healthKey = key || `circuit-breaker-${circuitName}`;
    const metrics = this.circuitBreakerService.getMetrics(circuitName);

    if (!metrics) {
      return {
        [healthKey]: {
          status: 'down',
          message: `Circuit breaker '${circuitName}' not found`,
        },
      };
    }

    const isHealthy = 
      metrics.state === CircuitBreakerState.CLOSED && 
      metrics.failureRate < 50;

    return {
      [healthKey]: {
        status: isHealthy ? 'up' : 'down',
        message: isHealthy 
          ? `Circuit breaker '${circuitName}' is healthy`
          : `Circuit breaker '${circuitName}' is unhealthy (${metrics.state}, ${metrics.failureRate.toFixed(1)}% failure rate)`,
        details: metrics,
      },
    };
  }
}