import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SpyInjectToken, VersioningMiddleware } from './versioning-middleware';
import { AppV1Controller } from './app-v1.controller';
import * as sinon from 'sinon';
import { AppV3Controller } from './app-v3.controller';
import { NoVersioningController } from './no-versioning.controller';
import { AppV2Controller } from './app-v2.controller';

@Module({
  providers: [
    {
      provide: SpyInjectToken,
      useValue: sinon.spy(),
    },
  ],
  controllers: [
    NoVersioningController,
    AppV1Controller,
    AppV2Controller,
    AppV3Controller,
  ],
})
export class AppWithMiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VersioningMiddleware)
      .forRoutes(NoVersioningController, AppV1Controller, AppV3Controller);
  }
}
