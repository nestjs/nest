import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        req.extras = { param: req.params };
        next();
      })
      .forRoutes({ path: '*', method: RequestMethod.GET })
      .apply((req, res, next) => {
        req.extras = {
          version: 'v2',
          param: req.params,
        };
        next();
      })
      .forRoutes({ path: '*', method: RequestMethod.GET, version: '2' });
  }
}
