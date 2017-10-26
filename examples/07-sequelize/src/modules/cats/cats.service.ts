import { Model } from 'sequelize-typescript';
import { Cat } from './cat.entity';
import { CreateCatDto } from './dto/create-cat.dto';

import { Component, Inject } from '';

@Component()
export class CatsService {
  constructor(
    @Inject('CatsRepository') private readonly catsRepository: typeof Model) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const cat = new Cat();
    cat.name = createCatDto.name;
    cat.breed = createCatDto.breed;
    cat.age = createCatDto.age;

    return await cat.save();
  }

  async findAll(): Promise<Cat[]> {
    return await this.catsRepository.findAll<Cat>();
  }
}
