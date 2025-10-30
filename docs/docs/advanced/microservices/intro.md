---
sidebar_position: 1
---

# Microservices Architecture: Building Distributed Systems with NestJS

NestJS's microservices module transforms your monolith into a distributed system. Learn the patterns used by production microservices.

## Why Microservices?

```
Monolith:                     Microservices:
┌────────────────┐            ┌─────────┐  ┌─────────┐
│   Single App   │            │  Users  │  │ Orders  │
│  - Users       │    →       │ Service │  │ Service │
│  - Orders      │            └─────────┘  └─────────┘
│  - Payments    │                 │            │
└────────────────┘            ┌─────────────────────┐
                              │  Payments Service   │
                              └─────────────────────┘
```

**Benefits:**
- 🔧 Independent deployment
- 📈 Horizontal scaling
- 🛡️ Fault isolation
- 🎯 Technology flexibility
- 👥 Team autonomy

**Trade-offs:**
- ⚠️ Distributed system complexity
- 🌐 Network latency
- 🔄 Data consistency challenges
- 📊 Monitoring complexity

## Transport Layers

NestJS supports multiple transport layers:

| Transport | Use Case | Performance | Reliability |
|-----------|----------|-------------|-------------|
| **TCP** | Default, simple | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Redis** | Pub/Sub patterns | ⭐⭐⭐ | ⭐⭐⭐ |
| **NATS** | Cloud-native | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **RabbitMQ** | Enterprise messaging | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Kafka** | Event streaming | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **gRPC** | High performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **MQTT** | IoT devices | ⭐⭐⭐ | ⭐⭐⭐ |

## Quick Start: TCP Microservice

### Service (Microservice)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3001,
      },
    },
  );

  await app.listen();
  console.log('Microservice is listening on port 3001');
}
bootstrap();
```

```typescript
// users.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class UsersController {
  @MessagePattern({ cmd: 'get_user' })
  getUser(@Payload() id: string) {
    return { id, name: 'John Doe', email: 'john@example.com' };
  }

  @MessagePattern({ cmd: 'create_user' })
  createUser(@Payload() data: { name: string; email: string }) {
    return { id: '123', ...data };
  }
}
```

### Client (Gateway)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
  ],
})
export class AppModule {}
```

```typescript
// api.controller.ts
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('users')
export class ApiController {
  constructor(
    @Inject('USER_SERVICE') private userService: ClientProxy,
  ) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    // Send message and wait for response
    return firstValueFrom(
      this.userService.send({ cmd: 'get_user' }, id)
    );
  }
}
```

## Communication Patterns

### 1. Request-Response Pattern

**Synchronous**: Client waits for response

```typescript
// Service
@Controller()
export class MathController {
  @MessagePattern({ cmd: 'add' })
  add(@Payload() data: { a: number; b: number }) {
    return { result: data.a + data.b };
  }
}

// Client
async calculate() {
  const result = await firstValueFrom(
    this.mathService.send({ cmd: 'add' }, { a: 5, b: 3 })
  );
  console.log(result); // { result: 8 }
}
```

### 2. Event-Based Pattern

**Asynchronous**: Fire and forget

```typescript
// Service (Multiple listeners possible)
@Controller()
export class NotificationController {
  @EventPattern('user_created')
  handleUserCreated(@Payload() data: any) {
    console.log('Sending welcome email to', data.email);
    // No return value expected
  }
}

@Controller()
export class AnalyticsController {
  @EventPattern('user_created')
  handleUserCreated(@Payload() data: any) {
    console.log('Tracking new user', data.id);
  }
}

// Client
async createUser(data: any) {
  await this.userRepo.save(data);

  // Emit event (no response expected)
  this.clientProxy.emit('user_created', data);
}
```

## Advanced Patterns

### Pattern 1: Circuit Breaker

Prevent cascading failures:

```typescript
import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, timeout, retry } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

@Injectable()
export class ResilientService {
  private failureCount = 0;
  private circuitOpen = false;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_MS = 5000;

  constructor(
    @Inject('EXTERNAL_SERVICE') private client: ClientProxy,
  ) {}

  async callService(pattern: any, data: any) {
    // Circuit breaker logic
    if (this.circuitOpen) {
      console.log('Circuit is OPEN - using fallback');
      return this.fallback();
    }

    try {
      const result = await firstValueFrom(
        this.client.send(pattern, data).pipe(
          timeout(this.TIMEOUT_MS),
          retry(2),
          catchError(error => {
            this.handleFailure();
            return throwError(() => error);
          }),
        ),
      );

      this.resetCircuit();
      return result;
    } catch (error) {
      return this.fallback();
    }
  }

  private handleFailure() {
    this.failureCount++;

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitOpen = true;

      // Auto-reset after 30 seconds
      setTimeout(() => {
        console.log('Attempting to close circuit...');
        this.circuitOpen = false;
        this.failureCount = 0;
      }, 30000);
    }
  }

  private resetCircuit() {
    this.failureCount = 0;
    this.circuitOpen = false;
  }

  private fallback() {
    return { status: 'degraded', message: 'Using cached data' };
  }
}
```

### Pattern 2: Saga Pattern

Distributed transactions:

```typescript
import { Injectable } from '@nestjs/common';

interface SagaStep {
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

@Injectable()
export class SagaOrchestrator {
  async executeSaga(steps: SagaStep[]) {
    const completedSteps: SagaStep[] = [];

    try {
      // Execute all steps
      for (const step of steps) {
        const result = await step.execute();
        completedSteps.push(step);
      }

      return { success: true };
    } catch (error) {
      console.error('Saga failed, compensating...', error);

      // Compensate in reverse order
      for (const step of completedSteps.reverse()) {
        try {
          await step.compensate();
        } catch (compensationError) {
          console.error('Compensation failed!', compensationError);
        }
      }

      throw error;
    }
  }
}

// Usage: Order processing saga
@Injectable()
export class OrderService {
  constructor(
    private saga: SagaOrchestrator,
    @Inject('PAYMENT_SERVICE') private paymentService: ClientProxy,
    @Inject('INVENTORY_SERVICE') private inventoryService: ClientProxy,
    @Inject('SHIPPING_SERVICE') private shippingService: ClientProxy,
  ) {}

  async createOrder(orderData: any) {
    const steps: SagaStep[] = [
      {
        // Step 1: Reserve inventory
        execute: async () => {
          return firstValueFrom(
            this.inventoryService.send({ cmd: 'reserve' }, orderData.items)
          );
        },
        compensate: async () => {
          await firstValueFrom(
            this.inventoryService.send({ cmd: 'release' }, orderData.items)
          );
        },
      },
      {
        // Step 2: Process payment
        execute: async () => {
          return firstValueFrom(
            this.paymentService.send({ cmd: 'charge' }, orderData.payment)
          );
        },
        compensate: async () => {
          await firstValueFrom(
            this.paymentService.send({ cmd: 'refund' }, orderData.payment)
          );
        },
      },
      {
        // Step 3: Create shipment
        execute: async () => {
          return firstValueFrom(
            this.shippingService.send({ cmd: 'create' }, orderData.shipping)
          );
        },
        compensate: async () => {
          await firstValueFrom(
            this.shippingService.send({ cmd: 'cancel' }, orderData.shipping)
          );
        },
      },
    ];

    return this.saga.executeSaga(steps);
  }
}
```

### Pattern 3: Event Sourcing

Store events instead of state:

```typescript
import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

interface Event {
  type: string;
  aggregateId: string;
  data: any;
  timestamp: Date;
  version: number;
}

@Injectable()
export class EventStore {
  private events: Event[] = [];

  async append(event: Event): Promise<void> {
    this.events.push(event);

    // Publish to event bus
    this.eventBus.emit('event_stored', event);
  }

  async getEvents(aggregateId: string): Promise<Event[]> {
    return this.events.filter(e => e.aggregateId === aggregateId);
  }

  async replayEvents(aggregateId: string): Promise<any> {
    const events = await this.getEvents(aggregateId);

    // Rebuild state from events
    let state = {};
    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }

  private applyEvent(state: any, event: Event): any {
    switch (event.type) {
      case 'USER_CREATED':
        return { ...state, ...event.data };
      case 'EMAIL_UPDATED':
        return { ...state, email: event.data.email };
      case 'USER_DELETED':
        return { ...state, deleted: true };
      default:
        return state;
    }
  }
}

// Usage
@Injectable()
export class UserService {
  constructor(private eventStore: EventStore) {}

  async createUser(data: any) {
    const event: Event = {
      type: 'USER_CREATED',
      aggregateId: data.id,
      data,
      timestamp: new Date(),
      version: 1,
    };

    await this.eventStore.append(event);
  }

  async getUser(id: string) {
    // Rebuild from events
    return this.eventStore.replayEvents(id);
  }
}
```

## Service Discovery

### Using Consul

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import Consul from 'consul';

@Injectable()
export class ServiceRegistry implements OnModuleInit {
  private consul: Consul;

  async onModuleInit() {
    this.consul = new Consul({ host: 'consul.local' });

    // Register service
    await this.consul.agent.service.register({
      name: 'user-service',
      address: 'localhost',
      port: 3001,
      check: {
        http: 'http://localhost:3001/health',
        interval: '10s',
      },
    });
  }

  async discoverService(name: string) {
    const services = await this.consul.health.service({
      service: name,
      passing: true,
    });

    return services[0]?.Service;
  }
}
```

## Monitoring & Observability

### Distributed Tracing

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const traceId = this.generateTraceId();

    // Add trace ID to request context
    const request = context.switchToHttp().getRequest();
    request.traceId = traceId;

    console.log(`[${traceId}] Request started`);

    return next.handle().pipe(
      tap(() => console.log(`[${traceId}] Request completed`)),
    );
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
```

## Key Takeaways

1. **Choose the right transport**: TCP for simplicity, gRPC for performance, RabbitMQ for reliability
2. **Pattern matters**: Request-Response for queries, Events for notifications
3. **Handle failures**: Circuit breakers, retries, timeouts
4. **Saga for consistency**: Distributed transactions require compensation logic
5. **Monitor everything**: Distributed tracing is essential

## Next Steps

- [gRPC](/docs/advanced/microservices/grpc) - High-performance RPC
- [Kafka](/docs/advanced/microservices/kafka) - Event streaming at scale
- [RabbitMQ](/docs/advanced/microservices/rabbitmq) - Reliable message queuing

---

**Build resilient distributed systems** 🌐
