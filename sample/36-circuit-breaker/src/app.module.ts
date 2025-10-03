import { Module } from '@nestjs/common';
import { CircuitBreakerModule } from '../../../packages/common/circuit-breaker';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ExternalApiService } from './services/external-api.service';
import { DatabaseService } from './services/database.service';
import { ApiController } from './controllers/api.controller';
import { HealthController } from './controllers/health.controller';
import { MetricsController } from './controllers/metrics.controller';

@Module({
  imports: [
    // Import Circuit Breaker Module with global configuration
    CircuitBreakerModule.forRoot({
      circuits: {
        'external-api': {
          failureThreshold: 3,
          timeout: 30000, // 30 seconds
          successThreshold: 2,
          timeWindow: 60000, // 1 minute
        },
        'database': {
          failureThreshold: 5,
          timeout: 45000, // 45 seconds
          successThreshold: 3,
          timeWindow: 120000, // 2 minutes
        },
      },
      enableGlobalInterceptor: true,
    }),
    
    // Health check module
    TerminusModule,
    
    // HTTP module for external API calls
    HttpModule,
  ],
  controllers: [
    ApiController,
    HealthController,
    MetricsController,
  ],
  providers: [
    ExternalApiService,
    DatabaseService,
  ],
})
export class AppModule {}