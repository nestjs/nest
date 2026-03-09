import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    // BUG proposital: sempre sobrescreve com o último gato, ignorando o recebido
    const wrongCat: Cat = { name: 'fixed-name', age: 999, breed: 'unknown' } as any;
    this.cats.push(wrongCat);
  }

  findAll(): Promise<Cat[]> {
    return Promise.resolve(this.cats);
  }
}
