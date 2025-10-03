import 'reflect-metadata';
import { CIRCUIT_BREAKER_METADATA } from '../constants';
import { CircuitBreakerOptions } from '../interfaces/circuit-breaker-options.interface';

/**
 * Circuit Breaker decorator
 * 
 * Applies circuit breaker pattern to a method or class.
 * When applied to a method, it wraps the method execution with circuit breaker logic.
 * When applied to a class, it applies default circuit breaker settings to all methods.
 * 
 * @param options Circuit breaker configuration options
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class ApiService {
 *   @CircuitBreaker({ 
 *     name: 'external-api',
 *     failureThreshold: 3,
 *     timeout: 30000 
 *   })
 *   async callExternalApi(): Promise<any> {
 *     // This method is protected by circuit breaker
 *     return await fetch('/api/external');
 *   }
 * }
 * ```
 */
export function CircuitBreaker(options: CircuitBreakerOptions = {}): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      // Method decorator
      (Reflect as any).defineMetadata(CIRCUIT_BREAKER_METADATA, options, descriptor.value);
      return descriptor;
    } else {
      // Class decorator
      (Reflect as any).defineMetadata(CIRCUIT_BREAKER_METADATA, options, target);
      return target;
    }
  };
}