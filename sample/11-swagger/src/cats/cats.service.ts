import { Injectable } from '@nestjs/common';
import { Cat } from './classes/cat.class';
import { CreateCatDto } from './dto/create-cat.dto';

@Injectable()
export class CatsService {
  private readonly cats: CreateCatDto[] = [];

  create(cat: CreateCatDto): Cat {
    this.cats.push(cat);
    return {
      id: (this.cats.length - 1),
      ...cat,
    };
  }

  findOne(id: number): Cat {
    return {
      id,
      ...this.cats[id],
    };
  }
}
