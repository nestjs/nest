import { forwardRef, Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantContext } from './durable-context-id.strategy';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableDogsService {
  constructor(
    @Inject(REQUEST) private readonly requestPayload: TenantContext,
  ) {}

  bark() {
    return `woof from ${this.requestPayload.tenantId}`;
  }
}

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableCatsService {
  constructor(
    @Inject(REQUEST) private readonly requestPayload: TenantContext,
    @Inject(forwardRef(() => DurableDogsService))
    private readonly dogsService: DurableDogsService,
  ) {}

  meow() {
    return {
      constructorCalled: !!this.requestPayload,
      tenantId: this.requestPayload?.tenantId,
      dog: this.dogsService?.bark(),
    };
  }
}
