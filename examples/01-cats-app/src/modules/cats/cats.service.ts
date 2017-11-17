import {Component} from '@nestjs/common';

import {CatsModule} from './cats.module';
import {Cat} from './interfaces/cat.interface';

@Component()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) { this.cats.push(cat); }

  findAll(): Cat[] { return this.cats; }
}