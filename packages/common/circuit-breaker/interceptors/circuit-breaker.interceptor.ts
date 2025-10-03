import { Injectable } from '../../decorators/core/injectable.decorator';
import { NestInterceptor, CallHandler } from '../../interfaces/features/nest-interceptor.interface';
import { ExecutionContext } from '../../interfaces/features/execution-context.interface';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { CIRCUIT_BREAKER_METADATA } from '../constants';
import { CircuitBreakerOptions } from '../interfaces/circuit-breaker-options.interface';

/**
 * Circuit Breaker Interceptor
 * 
 * Automatically applies circuit breaker logic to methods decorated with @CircuitBreaker
 */
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const handler = context.getHandler();
    const options: CircuitBreakerOptions = (Reflect as any).getMetadata(CIRCUIT_BREAKER_METADATA, handler);

    if (!options) {
      // No circuit breaker configured, proceed normally
      return next.handle();
    }

    // Generate circuit name if not provided
    const circuitName = options.name || this.generateCircuitName(context);
    
    // Get the original observable
    const originalObservable = next.handle();
    
    // Transform it to use circuit breaker
    return {
      toPromise: () => {
        return this.circuitBreakerService.execute(
          circuitName,
          () => originalObservable.toPromise(),
          options
        );
      },
      subscribe: (observer: any) => {
        this.circuitBreakerService
          .execute(circuitName, () => originalObservable.toPromise(), options)
          .then(result => {
            if (observer.next) observer.next(result);
            if (observer.complete) observer.complete();
          })
          .catch(error => {
            if (observer.error) observer.error(error);
          });
      }
    };
  }

  private generateCircuitName(context: ExecutionContext): string {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    return `${className}.${methodName}`;
  }
}