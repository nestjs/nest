import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppV1Controller } from './app-v1.controller';
import { AppV2Controller } from './app-v2.controller';
import { MiddlewareController } from './middleware.controller';
import { MultipleMiddlewareVersionController } from './multiple-middleware.controller';
import { MultipleVersionController } from './multiple.controller';
import { VersionNeutralMiddlewareController } from './neutral-middleware.controller';
import { VersionNeutralController } from './neutral.controller';
import { NoVersioningController } from './no-versioning.controller';
import { OverridePartialController } from './override-partial.controller';
import { OverrideController } from './override.controller';

@Module({
  imports: [],
  controllers: [
    AppV1Controller,
    AppV2Controller,
    MultipleVersionController,
    NoVersioningController,
    VersionNeutralController,
    OverrideController,
    OverridePartialController,
    MiddlewareController,
    MultipleMiddlewareVersionController,
    VersionNeutralMiddlewareController,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res) => res.end('Hello from middleware function!'))
      .forRoutes(
        MiddlewareController,
        MultipleMiddlewareVersionController,
        VersionNeutralMiddlewareController,
      );
  }
}
