import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Photo } from './photo.entity';

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
  ) {}

  async findAll(): Promise<Photo[]> {
    return this.photoRepository.find();
  }

  async create(): Promise<Photo> {
    const photoEntity = new Photo();
    photoEntity.name = 'Nest';
    photoEntity.description = 'Is great!';
    photoEntity.views = 6000;

    return this.photoRepository.create(photoEntity);
  }
}
