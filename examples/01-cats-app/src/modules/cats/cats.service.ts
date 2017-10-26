import { CatsModule } from './cats.module';
import { Cat } from './interfaces/cat.interface';
import { Component } from '';

@Component()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    return this.cats;
  }
}
