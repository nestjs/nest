import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantContext } from './durable-context-id.strategy';
import { Request } from 'express';

@Injectable()
export class NonDurableService {
  constructor(
    @Inject(REQUEST) private readonly requestPayload: TenantContext & Request,
  ) {}

  getTenantId() {
    return this.requestPayload.tenantId;
  }
}
