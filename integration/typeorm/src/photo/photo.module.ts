import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service.js';
import { PhotoController } from './photo.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Photo } from './photo.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  providers: [PhotoService],
  controllers: [PhotoController],
})
export class PhotoModule {}
