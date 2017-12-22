import { Component } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';
import { CatsModule } from './cats.module';

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
