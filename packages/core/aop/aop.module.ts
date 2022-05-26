import { Module } from '@nestjs/common';
import { AutoAspectExecutor } from './auto-aspect-executor';
import { DiscoveryModule } from '../discovery';

@Module({
  imports: [DiscoveryModule],
  providers: [AutoAspectExecutor],
})
export class AopModule {}
