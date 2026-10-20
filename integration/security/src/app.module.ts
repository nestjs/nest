import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AnswerMiddleware } from './answer.middleware.js';
import { AppController } from './app.controller.js';
import { HooksController } from './hooks.controller.js';

@Module({
  controllers: [AppController, HooksController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AnswerMiddleware).forRoutes('middleware');
  }
}
