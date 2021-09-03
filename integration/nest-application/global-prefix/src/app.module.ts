import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { Request, Response, NextFunction } from 'express';

@Module({
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const middlewareFunction = (
      req: Request & { hello: boolean },
      res: Response,
      next: NextFunction,
    ) => {
      req.hello = true;
      next();
    };
    consumer.apply(middlewareFunction).forRoutes('*');
  }
}
