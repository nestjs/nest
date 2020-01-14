import { Controller, Get, Post, Body } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { Photo } from './photo.entity';

import * as Debug from 'debug';
const debug = Debug('app:photo.controller');

@Controller('photo')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Get()
  findAll(): Promise<Photo[]> {
    debug('findAll');
    return this.photoService.findAll();
  }

  @Post()
  create(@Body() photo: Photo): Promise<Photo> {
    debug('create');
    return this.photoService.create(photo);
  }
}
