import { CircuitBreakerService } from './services/circuit-breaker.service';
import { CircuitBreakerInterceptor } from './interceptors/circuit-breaker.interceptor';
import { CircuitBreakerOptions } from './interfaces/circuit-breaker-options.interface';

/**
 * Global Circuit Breaker Module Configuration
 */
export interface CircuitBreakerModuleOptions {
  /**
   * Global circuit breaker configurations
   */
  circuits?: Record<string, CircuitBreakerOptions>;

  /**
   * Whether to automatically apply circuit breaker interceptor globally
   * @default false
   */
  enableGlobalInterceptor?: boolean;
}

/**
 * Circuit Breaker Module
 * 
 * Provides circuit breaker functionality for resilient service communication
 */
export class CircuitBreakerModule {
  /**
   * Register circuit breaker module with configuration
   */
  static forRoot(options: CircuitBreakerModuleOptions = {}) {
    const providers: any[] = [
      CircuitBreakerService,
      CircuitBreakerInterceptor,
    ];

    // Add configuration provider if circuits are defined
    if (options.circuits) {
      providers.push({
        provide: 'CIRCUIT_BREAKER_CONFIG',
        useValue: options.circuits,
      });
    }

    return {
      module: CircuitBreakerModule,
      providers,
      exports: [CircuitBreakerService, CircuitBreakerInterceptor],
      global: true,
    };
  }

  /**
   * Register circuit breaker module for feature modules
   */
  static forFeature() {
    return {
      module: CircuitBreakerModule,
      providers: [CircuitBreakerService, CircuitBreakerInterceptor],
      exports: [CircuitBreakerService, CircuitBreakerInterceptor],
    };
  }
}