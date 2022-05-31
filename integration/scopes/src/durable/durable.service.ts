import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableService {
  public instanceCounter = 0;

  greeting() {
    ++this.instanceCounter;
    return `Hello world! Counter: ${this.instanceCounter}`;
  }
}
