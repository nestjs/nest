import { MiddlewareConsumer } from '../middleware/middleware-consumer.interface';

/**
 * @publicApi
 */
export interface NestModule {
  configure(consumer: MiddlewareConsumer);
}
