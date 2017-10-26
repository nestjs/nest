import { CoreModule } from '../core/core.module';
import { FeatureService } from './feature.service';
import { Module } from '';

@Module({
  modules: [CoreModule],
  components: [FeatureService],
})
export class FeatureModule {}
