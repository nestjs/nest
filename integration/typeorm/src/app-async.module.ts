import { Module } from '@nestjs/common';

import { PhotoModule } from './photo/photo.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [DatabaseModule.forRoot(), PhotoModule],
})
export class AsyncApplicationModule {}
