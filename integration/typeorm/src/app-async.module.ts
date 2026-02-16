import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module.js';
import { PhotoModule } from './photo/photo.module.js';

@Module({
  imports: [DatabaseModule.forRoot(), PhotoModule],
})
export class AsyncApplicationModule {}
