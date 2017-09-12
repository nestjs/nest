import { Component, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Photo } from './photo.entity';

@Component()
export class PhotoService {
  constructor(
    @Inject('PhotoRepositoryToken') private readonly photoRepository: Repository<Photo>) {}
}