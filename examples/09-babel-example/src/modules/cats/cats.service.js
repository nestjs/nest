import { Component } from '@nestjs/core';
import { CatsModule } from './cats.module';

@Component()
export class CatsService {
  constructor() {
    this.cats = [];
  }

  create(cat) {
    this.cats.push(cat);
  }

  findAll() {
    return this.cats;
  }
}
