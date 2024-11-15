import {
  Inject,
  Injectable,
  PreconditionFailedException,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableService {
  public instanceCounter = 0;

  constructor(
    @Inject(REQUEST)
    public readonly requestPayload: { tenantId: string; forceError: boolean },
  ) {
    if (requestPayload.forceError) {
      throw new PreconditionFailedException('Forced error');
    }
  }

  greeting() {
    ++this.instanceCounter;
    return `Hello world! Counter: ${this.instanceCounter}`;
  }
}
