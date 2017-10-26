import { CommonModule } from '../common/common.module';
import { FeatureModule } from '../feature/feature.module';
import { ContextService } from './context.service';
import { CoreService } from './core.service';
import { Module } from '';

@Module({
  modules: [CommonModule],
  components: [CoreService, ContextService],
  exports: [CommonModule],
})
export class CoreModule {}
