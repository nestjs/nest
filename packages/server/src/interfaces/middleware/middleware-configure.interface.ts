import { MiddlewareConsumer } from './middleware-consumer.interface';

export interface MiddlewareConfigure {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void;
}
