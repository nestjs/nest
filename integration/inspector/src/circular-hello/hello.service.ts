import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class HelloService {
  static COUNTER = 0;
  constructor(@Inject('META') private readonly meta) {
    HelloService.COUNTER++;
  }

  greeting(): string {
    return 'Hello world!';
  }
}
