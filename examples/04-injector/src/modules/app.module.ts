import { Module } from '@nestjs/core';
import { CoreModule } from './core/core.module';
import { FeatureModule } from './feature/feature.module';

@Module({
  modules: [FeatureModule],
})
export class ApplicationModule {}
