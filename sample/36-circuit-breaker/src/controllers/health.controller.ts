import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  HealthIndicatorResult 
} from '@nestjs/terminus';
import { CircuitBreakerHealthIndicator } from '../../../../packages/common/circuit-breaker/health/circuit-breaker-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private circuitBreakerHealth: CircuitBreakerHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Check all circuit breakers
      () => this.circuitBreakerHealth.checkCircuitBreakers('circuit-breakers'),
      
      // Check specific circuit breakers
      () => this.circuitBreakerHealth.checkCircuitBreaker('external-api'),
      () => this.circuitBreakerHealth.checkCircuitBreaker('database-read'),
      () => this.circuitBreakerHealth.checkCircuitBreaker('database-write'),
    ]);
  }

  @Get('circuit-breakers')
  async checkCircuitBreakers() {
    return this.circuitBreakerHealth.checkCircuitBreakers();
  }

  @Get('circuit-breakers/:name')
  async checkSpecificCircuitBreaker(@Param('name') name: string) {
    return this.circuitBreakerHealth.checkCircuitBreaker(name);
  }
}