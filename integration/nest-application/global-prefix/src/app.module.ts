import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';

export const MIDDLEWARE_VALUE = 'middleware';
export const MIDDLEWARE_PARAM_VALUE = 'middleware_param';

@Module({
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .forRoutes({ path: MIDDLEWARE_VALUE, method: RequestMethod.GET })
      .apply((req, res, next) => res.status(201).end(MIDDLEWARE_VALUE))
      .forRoutes({ path: MIDDLEWARE_VALUE, method: RequestMethod.POST })
      .apply((req, res, next) => res.end(MIDDLEWARE_PARAM_VALUE))
      .forRoutes({ path: MIDDLEWARE_VALUE + '/*', method: RequestMethod.GET })
      .apply((req, res, next) => res.status(201).end(MIDDLEWARE_PARAM_VALUE))
      .forRoutes({ path: MIDDLEWARE_VALUE + '/*', method: RequestMethod.POST })
      .apply((req, res, next) => {
        req.extras = { data: 'Data attached in middleware' };
        next();
      })
      .forRoutes({ path: '*', method: RequestMethod.GET })
      .apply((req, res, next) => {
        req.middlewareParams = req.params;
        next();
      })
      .forRoutes({ path: '*', method: RequestMethod.GET });
  }
}
