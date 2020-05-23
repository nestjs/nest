import { Injectable } from '@nestjs/common';
import {Cat, Owner} from '../graphql.schema';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [{ id: 1, name: 'Cat', age: 5, ownerId: 1 }];
  private readonly owners: Owner[] = [{ id: 1, name: 'Jon', age: 5 }];

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

  findOwnerById(id: number): Owner {
    return this.owners.find(owner => owner.id === id);
  }
}
