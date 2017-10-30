import { Module } from '@nestjs/core';
import { PhotoModule } from './photo/photo.module';

@Module({
  modules: [PhotoModule],
})
export class ApplicationModule {}
