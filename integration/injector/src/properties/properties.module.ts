import { Module } from '@nestjs/common';
import { DependencyService } from './dependency.service';
import { PropertiesService } from './properties.service';

@Module({
  providers: [DependencyService, PropertiesService],
})
export class PropertiesModule {}
