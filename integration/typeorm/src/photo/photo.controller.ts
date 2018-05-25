import { Controller, Get, Post } from '@nestjs/common';
import { Photo } from './photo.entity';
import { PhotoService } from './photo.service';

@Controller('photo')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Get()
  findAll(): Promise<Photo[]> {
    return this.photoService.findAll();
  }

  @Post()
  create(): Promise<Photo> {
    return this.photoService.create();
  }
}
