import { Module } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { CoreModule } from '../core/core.module';

@Module({
  modules: [CoreModule],
  components: [FeatureService],
})
export class FeatureModule {}