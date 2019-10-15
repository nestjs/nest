import { Module } from '@nestjs/common';
import { PhotoModule } from './photo/photo.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [PhotoModule, DatabaseModule],
})
export class ApplicationModule {}
