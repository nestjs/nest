import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from './photo.entity';

import * as Debug from 'debug';
const debug = Debug('app:photo.service');

@Injectable()
export class PhotoService {
  save(photo: Photo): Promise<Photo> {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
  ) {}

  async findAll(): Promise<Photo[]> {
    debug('findAll');
    return this.photoRepository.find();
  }

  async create(photo: Photo): Promise<Photo> {
    debug('create');
    return this.photoRepository.save(photo);
  }
}
