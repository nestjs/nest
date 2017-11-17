import {Component, Inject} from '@nestjs/common';
import {Model} from 'mongoose';

import {CreateCatDto} from './dto/create-cat.dto';
import {Cat} from './interfaces/cat.interface';

@Component()
export class CatsService {
  constructor(@Inject('CatModelToken') private readonly catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const createdCat = new this.catModel(createCatDto);
    return await createdCat.save();
  }

  async findAll(): Promise<Cat[]> { return await this.catModel.find().exec(); }
}