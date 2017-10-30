import { Module } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { photoProviders } from './photo.providers';
import { PhotoService } from './photo.service';

@Module({
  modules: [DatabaseModule],
  components: [
    ...photoProviders,
    PhotoService,
  ],
})
export class PhotoModule {}
