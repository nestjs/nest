import { Module } from '@nestjs/core';
import { CommonModule } from '../core/core.module';
import { FeatureModule } from '../feature/feature.module';
import { ContextService } from './context.service';
import { CoreService } from './core.service';

@Module({
  modules: [CommonModule],
  components: [CoreService, ContextService],
  exports: [CommonModule],
})
export class CoreModule {}
