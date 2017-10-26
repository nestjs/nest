import { CoreModule } from './core/core.module';
import { FeatureModule } from './feature/feature.module';
import { Module } from '';

@Module({
  modules: [FeatureModule],
})
export class ApplicationModule {}
