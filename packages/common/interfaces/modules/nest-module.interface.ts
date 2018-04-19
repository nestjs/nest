import { MiddlewaresConsumer } from '../middlewares/middlewares-consumer.interface';

export interface NestModule {
  configure(consumer: MiddlewaresConsumer): MiddlewaresConsumer | void;
}
