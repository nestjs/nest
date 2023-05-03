import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import { CatsModule } from './cats/cats.module';
import { CoreModule } from './core/core.module';
import {LoggerMiddleware} from "./common/middleware/logger.middleware";

@Module({
  imports: [CatsModule, CoreModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
