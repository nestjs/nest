import { Module } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
  providers: [FeatureService],
})
export class FeatureModule {}
