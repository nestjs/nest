import { Injectable } from '@nestjs/common';
import { Cat } from './classes/cat.class';
import { CreateCatDto } from './dto/create-cat.dto';

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
