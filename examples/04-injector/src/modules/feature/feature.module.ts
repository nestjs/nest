import { Module } from '@nestjs/core';
import { CoreModule } from '../common/core.module';
import { FeatureService } from './feature.service';

@Module({
  modules: [CoreModule],
  components: [FeatureService],
})
export class FeatureModule {}
