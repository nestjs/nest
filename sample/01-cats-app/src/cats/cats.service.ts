import { Inject, Injectable, Scope } from '@nestjs/common';
import { AsyncContext } from '@nestjs/core/hooks/async-context';
import { Boom } from './cats.module';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class Rawr {
  constructor() {
    console.log('rawr created (transient)');
  }
}
@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  private readonly cats: Cat[] = [];

  constructor(
    private readonly asyncContext: AsyncContext,
    @Inject('Boom') private readonly instance: Boom,
    private readonly rawr: Rawr,
  ) {
    console.log('CatsService has been created');
  }

  create(cat: Cat) {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    console.log(this.rawr);
    this.instance.boom();

    console.log(this.asyncContext.get('xd'));
    return this.cats;
  }
}
