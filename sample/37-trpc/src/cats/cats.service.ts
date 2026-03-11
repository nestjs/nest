import { Injectable } from '@nestjs/common';
import { Cat, CreateCatInput, UpdateCatInput, CatFilter } from './cats.schema';

@Injectable()
export class CatsService {
  private cats: Cat[] = [
    { id: 1, name: 'Whiskers', age: 3, breed: 'Siamese' },
    { id: 2, name: 'Mittens', age: 5, breed: 'Persian' },
    { id: 3, name: 'Shadow', age: 2, breed: 'Maine Coon' },
  ];
  private nextId = 4;

  findAll(filter?: CatFilter) {
    let result = [...this.cats];
    if (filter?.breed !== undefined) {
      const breed = filter.breed.toLowerCase();
      result = result.filter(c => c.breed.toLowerCase() === breed);
    }
    if (filter?.minAge !== undefined) {
      const minAge = filter.minAge;
      result = result.filter(c => c.age >= minAge);
    }
    if (filter?.maxAge !== undefined) {
      const maxAge = filter.maxAge;
      result = result.filter(c => c.age <= maxAge);
    }
    return result;
  }

  findById(id: number): Cat | undefined {
    return this.cats.find(c => c.id === id);
  }

  create(input: CreateCatInput): Cat {
    const cat: Cat = { id: this.nextId++, ...input };
    this.cats.push(cat);
    return cat;
  }

  update(input: UpdateCatInput): Cat | undefined {
    const cat = this.cats.find(c => c.id === input.id);
    if (!cat) return undefined;
    if (input.name !== undefined) cat.name = input.name;
    if (input.age !== undefined) cat.age = input.age;
    if (input.breed !== undefined) cat.breed = input.breed;
    return cat;
  }

  remove(id: number): Cat | undefined {
    const index = this.cats.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    return this.cats.splice(index, 1)[0];
  }
}
