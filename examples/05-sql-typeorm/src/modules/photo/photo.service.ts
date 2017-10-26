import { Repository } from 'typeorm';
import { Photo } from './photo.entity';
import { Component, Inject } from '';

@Component()
export class PhotoService {
  constructor(
    @Inject('PhotoRepositoryToken') private readonly photoRepository: Repository<Photo>) {}

  async findAll(): Promise<Photo[]> {
    return await this.photoRepository.find();
  }
}
