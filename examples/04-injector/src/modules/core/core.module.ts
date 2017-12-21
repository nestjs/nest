import { Module } from '@nestjs/common';
import { CoreService } from './core.service';
import { CommonModule } from '../common/common.module';
import { ContextService } from './context.service';
import { FeatureModule } from '../feature/feature.module';

@Module({
  modules: [CommonModule],
  components: [CoreService, ContextService],
  exports: [CommonModule]
})
export class CoreModule {}
