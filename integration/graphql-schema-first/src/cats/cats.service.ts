import { Injectable } from '@nestjs/common';

import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  static COUNTER = 0;
  private readonly cats: Cat[] = [{ id: 1, name: 'Cat', age: 5 }];

  constructor() {
    CatsService.COUNTER++;
  }

  create(cat: Cat): Cat {
    this.cats.push(cat);
    return cat;
  }

  findAll(): Cat[] {
    return this.cats;
  }

  findOneById(id: number): Cat {
    return this.cats.find(cat => cat.id === id);
  }
}
