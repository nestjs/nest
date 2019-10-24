import { Injectable } from '@nestjs/common';
import { Cat } from '../graphql.schema';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [{ id: 1, name: 'Cat', age: 5 }];

  create(cat: Cat): Cat {
    cat.id = this.cats.length + 1;
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
