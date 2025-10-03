# Circuit Breaker Feature for NestJS

A comprehensive **Circuit Breaker** implementation for NestJS that provides resilience and fault tolerance for service-to-service communication.

## 🚀 Features

- **Automatic Failure Detection**: Monitors service health and automatically opens circuits when failure thresholds are exceeded
- **Smart Recovery**: Implements half-open state for graceful service recovery testing
- **Comprehensive Metrics**: Tracks failure rates, response times, and circuit states
- **Health Check Integration**: Built-in health indicators for monitoring circuit breaker status
- **Decorator-Based Usage**: Simple `@CircuitBreaker()` decorator for method-level protection
- **Configurable Thresholds**: Customizable failure thresholds, timeouts, and recovery parameters
- **Event Callbacks**: Hooks for state changes, openings, closings, and rejections

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Monitoring & Metrics](#monitoring--metrics)
- [Best Practices](#best-practices)
- [Architecture](#architecture)

## 🔧 Installation

The Circuit Breaker feature is built into NestJS common package. Import it directly:

```typescript
import { 
  CircuitBreaker, 
  CircuitBreakerModule, 
  CircuitBreakerService 
} from '@nestjs/common';
```

## 🚀 Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { CircuitBreakerModule } from '@nestjs/common';

@Module({
  imports: [
    CircuitBreakerModule.forRoot({
      circuits: {
        'external-api': {
          failureThreshold: 5,
          timeout: 60000,
          successThreshold: 3,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Use the Decorator

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ApiService {
  constructor(private readonly httpService: HttpService) {}

  @CircuitBreaker({ 
    name: 'external-api',
    failureThreshold: 3,
    timeout: 30000 
  })
  async callExternalService(): Promise<any> {
    const response = await this.httpService.get('https://api.example.com/data').toPromise();
    return response.data;
  }
}
```

### 3. Manual Usage with Service

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from '@nestjs/common';

@Injectable()
export class DatabaseService {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  async findUsers(): Promise<User[]> {
    return this.circuitBreaker.execute(
      'database-read',
      async () => {
        // Your database operation
        return await this.userRepository.find();
      },
      {
        failureThreshold: 5,
        timeout: 45000,
      }
    );
  }
}
```

## ⚙️ Configuration

### Circuit Breaker Options

```typescript
interface CircuitBreakerOptions {
  // Circuit identifier
  name?: string;
  
  // Number of failures to open circuit (default: 5)
  failureThreshold?: number;
  
  // Successful calls needed to close circuit (default: 3)
  successThreshold?: number;
  
  // Time window for counting failures in ms (default: 60000)
  timeWindow?: number;
  
  // Time to wait before retry in ms (default: 60000)
  timeout?: number;
  
  // Max concurrent calls in half-open state (default: 1)
  halfOpenMaxCalls?: number;
  
  // Custom failure detection function
  isFailure?: (error: any) => boolean;
  
  // Event callbacks
  onStateChange?: (newState: string, oldState: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onReject?: () => void;
}
```

### Module Configuration

```typescript
CircuitBreakerModule.forRoot({
  circuits: {
    'payment-service': {
      failureThreshold: 3,
      timeout: 30000,
      successThreshold: 2,
      onOpen: () => console.log('Payment service circuit opened'),
      onClose: () => console.log('Payment service circuit closed'),
    },
    'notification-service': {
      failureThreshold: 5,
      timeout: 45000,
      isFailure: (error) => !error.message.includes('retry'),
    },
  },
  enableGlobalInterceptor: true,
})
```

## 💡 Usage Examples

### Database Operations

```typescript
@Injectable()
export class UserService {
  @CircuitBreaker({
    name: 'user-database',
    failureThreshold: 5,
    timeout: 60000,
    onOpen: () => this.logger.warn('User database circuit opened'),
  })
  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  @CircuitBreaker({
    name: 'user-database-write',
    failureThreshold: 3,
    timeout: 30000,
  })
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.userRepository.save(userData);
  }
}
```

### External API Calls

```typescript
@Injectable()
export class PaymentService {
  @CircuitBreaker({
    name: 'payment-gateway',
    failureThreshold: 3,
    timeout: 20000,
    successThreshold: 2,
    isFailure: (error) => error.status >= 500, // Only 5xx errors count
  })
  async processPayment(paymentData: PaymentDto): Promise<PaymentResult> {
    const response = await this.httpService.post('/api/payments', paymentData).toPromise();
    return response.data;
  }
}
```

### Microservice Communication

```typescript
@Injectable()
export class OrderService {
  @CircuitBreaker({
    name: 'inventory-service',
    failureThreshold: 4,
    timeout: 25000,
    onStateChange: (newState, oldState) => {
      this.metricsService.recordCircuitBreakerStateChange('inventory', newState, oldState);
    },
  })
  async checkInventory(productId: string): Promise<InventoryStatus> {
    return this.inventoryClient.send('check_inventory', { productId }).toPromise();
  }
}
```

## 📊 Circuit Breaker States

### CLOSED
- **Normal operation state**
- All requests are allowed through
- Failure count is tracked
- Transitions to OPEN when failure threshold is exceeded

### OPEN
- **Failure state - requests are blocked**
- All requests fail fast with `CircuitBreakerException`
- No actual service calls are made
- Transitions to HALF_OPEN after timeout period

### HALF_OPEN
- **Testing recovery state**
- Limited number of requests are allowed through
- Transitions to CLOSED after successful calls reach success threshold
- Transitions back to OPEN if any request fails

## 📈 Monitoring & Metrics

### Health Checks

```typescript
import { Controller, Get } from '@nestjs/common';
import { CircuitBreakerHealthIndicator } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor(private readonly cbHealth: CircuitBreakerHealthIndicator) {}

  @Get('circuit-breakers')
  async checkCircuits() {
    return this.cbHealth.checkCircuitBreakers();
  }

  @Get('circuit-breakers/:name')
  async checkSpecificCircuit(@Param('name') name: string) {
    return this.cbHealth.checkCircuitBreaker(name);
  }
}
```

### Metrics Collection

```typescript
@Injectable()
export class MetricsService {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getAllMetrics();
  }

  getSpecificCircuitMetrics(name: string) {
    return this.circuitBreaker.getMetrics(name);
  }
}
```

### Metrics Data Structure

```typescript
interface CircuitBreakerMetrics {
  state: string;                    // Current state (CLOSED/OPEN/HALF_OPEN)
  totalCalls: number;              // Total number of calls
  successfulCalls: number;         // Number of successful calls
  failedCalls: number;             // Number of failed calls
  rejectedCalls: number;           // Number of rejected calls
  failureRate: number;             // Failure rate percentage (0-100)
  averageResponseTime: number;     // Average response time in ms
  lastStateChange: Date;           // When state last changed
  lastOpenTime?: Date;             // When circuit last opened
  lastCloseTime?: Date;            // When circuit last closed
}
```

## 🛠️ API Reference

### CircuitBreakerService

#### `execute<T>(circuitName: string, fn: () => Promise<T>, options?: CircuitBreakerOptions): Promise<T>`
Execute a function with circuit breaker protection.

#### `getMetrics(circuitName: string): CircuitBreakerMetrics | null`
Get metrics for a specific circuit breaker.

#### `getAllMetrics(): Record<string, CircuitBreakerMetrics>`
Get metrics for all circuit breakers.

#### `openCircuit(circuitName: string): void`
Manually open a circuit breaker.

#### `closeCircuit(circuitName: string): void`
Manually close a circuit breaker.

#### `resetCircuit(circuitName: string): void`
Reset a circuit breaker to initial state.

### @CircuitBreaker() Decorator

```typescript
@CircuitBreaker(options?: CircuitBreakerOptions)
```

Can be applied to:
- **Methods**: Protects individual method calls
- **Classes**: Applies default settings to all methods

## 🎯 Best Practices

### 1. Choose Appropriate Thresholds

```typescript
// For critical services - fail fast
@CircuitBreaker({
  failureThreshold: 3,
  timeout: 15000,
})

// For non-critical services - be more tolerant
@CircuitBreaker({
  failureThreshold: 10,
  timeout: 60000,
})
```

### 2. Use Custom Failure Detection

```typescript
@CircuitBreaker({
  isFailure: (error) => {
    // Don't count client errors (4xx) as failures
    return error.status >= 500;
  },
})
```

### 3. Implement Fallback Strategies

```typescript
async callExternalService(): Promise<Data> {
  try {
    return await this.circuitBreaker.execute('external-api', () => 
      this.apiService.getData()
    );
  } catch (error) {
    if (error instanceof CircuitBreakerException) {
      // Circuit is open, return cached data or default
      return this.getCachedData();
    }
    throw error;
  }
}
```

### 4. Monitor and Alert

```typescript
@CircuitBreaker({
  onOpen: () => {
    this.alertingService.sendAlert('Circuit breaker opened for critical service');
  },
  onStateChange: (newState, oldState) => {
    this.metricsService.recordStateChange(newState, oldState);
  },
})
```

### 5. Use Different Circuits for Different Operations

```typescript
@Injectable()
export class OrderService {
  @CircuitBreaker({ name: 'order-read', failureThreshold: 10 })
  async getOrders() { /* ... */ }

  @CircuitBreaker({ name: 'order-write', failureThreshold: 3 })
  async createOrder() { /* ... */ }
}
```

## 🏗️ Architecture

### Components

1. **CircuitBreakerService**: Core service managing circuit states
2. **@CircuitBreaker() Decorator**: Method-level circuit breaker application
3. **CircuitBreakerInterceptor**: Automatic circuit breaker logic application
4. **CircuitBreakerModule**: Module for dependency injection setup
5. **CircuitBreakerHealthIndicator**: Health check integration
6. **CircuitBreakerException**: Exception thrown when circuit is open

### State Management

```
CLOSED ──(failures ≥ threshold)──> OPEN
   ↑                                 │
   │                                 │
   │                            (timeout)
   │                                 │
   │                                 ↓
   └──(successes ≥ threshold)── HALF_OPEN
                                     │
                                     │
                                (any failure)
                                     │
                                     ↓
                                   OPEN
```

### Integration Points

- **Health Checks**: `/health/circuit-breakers`
- **Metrics**: `/metrics/circuit-breakers`
- **Manual Control**: `/admin/circuit-breakers/{name}/open|close|reset`

## 🔍 Troubleshooting

### Common Issues

1. **Circuit opens too frequently**
   - Increase `failureThreshold`
   - Adjust `timeWindow` for failure counting
   - Review `isFailure` function logic

2. **Circuit doesn't open when expected**
   - Check if failures occur within `timeWindow`
   - Verify `isFailure` function returns true for expected errors
   - Ensure circuit name consistency

3. **Slow recovery**
   - Reduce `timeout` value
   - Decrease `successThreshold`
   - Increase `halfOpenMaxCalls`

### Debug Mode

```typescript
@CircuitBreaker({
  name: 'debug-circuit',
  onStateChange: (newState, oldState) => {
    console.log(`Circuit state: ${oldState} → ${newState}`);
  },
  onOpen: () => console.log('Circuit opened - check service health'),
  onClose: () => console.log('Circuit closed - service recovered'),
  onReject: () => console.log('Request rejected - circuit is open'),
})
```

## 🤝 Contributing

When contributing to the Circuit Breaker feature:

1. Add tests for new functionality
2. Update documentation
3. Ensure backward compatibility
4. Follow NestJS coding standards
5. Add integration tests for real-world scenarios

## 📝 License

This feature is part of NestJS and follows the same MIT license.

---

**Note**: This Circuit Breaker implementation follows the standard Circuit Breaker pattern as described in Michael Nygard's "Release It!" and is designed to integrate seamlessly with NestJS applications for maximum resilience and fault tolerance.