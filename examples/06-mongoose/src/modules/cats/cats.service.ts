import { Model } from 'mongoose';
import { Component, Inject } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';
import { CatsModule } from './cats.module';
import { CreateCatDto } from './dto/create-cat.dto';

@Component()
export class CatsService {
  constructor(
    @Inject('CatModelToken') private readonly catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const cat = new this.catModel(createCatDto);
    return await cat.save();
  }

  async findAll(): Promise<Cat[]> {
    return await this.catModel.find().exec();
  }
}