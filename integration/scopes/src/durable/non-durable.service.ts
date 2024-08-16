import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantContext } from './durable-context-id.strategy';

@Injectable()
export class NonDurableService {
  constructor(
    @Inject(REQUEST) private readonly requestPayload: TenantContext,
  ) {}

  getTenantId() {
    return this.requestPayload.tenantId;
  }
}
