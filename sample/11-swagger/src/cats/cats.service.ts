import { Injectable } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './entities/cat.entity.js';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: CreateCatDto): Cat {
    this.cats.push(cat);
    return cat;
  }

  findOne(id: number): Cat {
    return this.cats[id];
  }
}
