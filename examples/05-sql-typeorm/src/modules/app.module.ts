import { Module } from '@nestjs/common';
import { PhotoModule } from './photo/photo.module';

@Module({
  modules: [PhotoModule],
})
export class ApplicationModule {}