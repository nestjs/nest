import { Controller, Get, Param } from '@nestjs/common';
import { CircuitBreakerService } from '../../../../packages/common/circuit-breaker';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  @Get('circuit-breakers')
  getAllCircuitBreakerMetrics() {
    const metrics = this.circuitBreakerService.getAllMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      total_circuits: Object.keys(metrics).length,
      circuits: metrics,
      summary: this.generateSummary(metrics),
    };
  }

  @Get('circuit-breakers/:name')
  getCircuitBreakerMetrics(@Param('name') name: string) {
    const metrics = this.circuitBreakerService.getMetrics(name);
    
    if (!metrics) {
      return {
        error: `Circuit breaker '${name}' not found`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      name,
      timestamp: new Date().toISOString(),
      metrics,
    };
  }

  @Get('circuit-breakers/:name/reset')
  resetCircuitBreaker(@Param('name') name: string) {
    this.circuitBreakerService.resetCircuit(name);
    
    return {
      message: `Circuit breaker '${name}' has been reset`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('circuit-breakers/:name/open')
  openCircuitBreaker(@Param('name') name: string) {
    this.circuitBreakerService.openCircuit(name);
    
    return {
      message: `Circuit breaker '${name}' has been manually opened`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('circuit-breakers/:name/close')
  closeCircuitBreaker(@Param('name') name: string) {
    this.circuitBreakerService.closeCircuit(name);
    
    return {
      message: `Circuit breaker '${name}' has been manually closed`,
      timestamp: new Date().toISOString(),
    };
  }

  private generateSummary(metrics: Record<string, any>) {
    const summary = {
      total_calls: 0,
      total_failures: 0,
      total_successes: 0,
      total_rejections: 0,
      average_failure_rate: 0,
      states: {
        CLOSED: 0,
        OPEN: 0,
        HALF_OPEN: 0,
      },
      average_response_time: 0,
    };

    const circuitNames = Object.keys(metrics);
    let totalResponseTime = 0;

    for (const [name, metric] of Object.entries(metrics)) {
      summary.total_calls += metric.totalCalls;
      summary.total_failures += metric.failedCalls;
      summary.total_successes += metric.successfulCalls;
      summary.total_rejections += metric.rejectedCalls;
      summary.states[metric.state]++;
      totalResponseTime += metric.averageResponseTime;
    }

    if (summary.total_calls > 0) {
      summary.average_failure_rate = (summary.total_failures / summary.total_calls) * 100;
    }

    if (circuitNames.length > 0) {
      summary.average_response_time = totalResponseTime / circuitNames.length;
    }

    return summary;
  }
}