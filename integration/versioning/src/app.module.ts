import { Module } from '@nestjs/common';
import { AppV1Controller } from './app-v1.controller';
import { AppV2Controller } from './app-v2.controller';
import { MultipleVersionController } from './multiple.controller';
import { VersionNeutralController } from './neutral.controller';
import { OverrideController } from './override.controller';
import { OverridePartialController } from './override-partial.controller';

@Module({
  imports: [],
  controllers: [
    AppV1Controller,
    AppV2Controller,
    MultipleVersionController,
    VersionNeutralController,
    OverrideController,
    OverridePartialController,
  ],
})
export class AppModule {}
