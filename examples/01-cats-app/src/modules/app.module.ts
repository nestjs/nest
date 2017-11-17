import {MiddlewaresConsumer, Module, NestModule} from '@nestjs/common';

import {CatsController} from './cats/cats.controller';
import {CatsModule} from './cats/cats.module';
import {LoggerMiddleware} from './common/middlewares/logger.middleware';

@Module({
  modules : [ CatsModule ],
})
export class ApplicationModule implements NestModule {
  configure(consumer: MiddlewaresConsumer): void {
    consumer.apply(LoggerMiddleware)
        .with('ApplicationModule')
        .forRoutes(CatsController);
  }
}