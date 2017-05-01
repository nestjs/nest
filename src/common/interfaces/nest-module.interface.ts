import { MiddlewareBuilder } from '../../core/middlewares/builder';
import { MiddlewaresConsumer } from './middlewares-consumer.interface';

export interface NestModule {
    configure?: (consumer: MiddlewaresConsumer) => MiddlewaresConsumer | void;
}