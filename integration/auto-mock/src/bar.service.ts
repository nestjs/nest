import { Injectable } from '@nestjs/common';
import { FooService } from './foo.service.js';

@Injectable()
export class BarService {
  constructor(private readonly foo: FooService) {}

  bar() {
    this.foo.foo();
  }
}
