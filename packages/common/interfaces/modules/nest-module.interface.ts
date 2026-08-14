import { MiddlewareConsumer } from '../middleware/middleware-consumer.interface.js';

/**
 * @publicApi
 */
export interface NestModule {
  configure(consumer: MiddlewareConsumer);
}
