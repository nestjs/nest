import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { PhotoController } from './photo.controller';

@Module({
  components: [PhotoService],
  controllers: [PhotoController]
})
export class PhotoModule {}
