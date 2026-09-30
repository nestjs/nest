import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Response } from 'express';
import { TenantContext } from './durable-context-id.strategy.js';

@Catch(BadRequestException)
@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableFilter implements ExceptionFilter {
  public instanceCounter = 0;
  constructor(
    @Inject(REQUEST) private readonly requestPayload: TenantContext,
  ) {}

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.getStatus()).json({
      tenantId: this.requestPayload.tenantId,
      instanceCounter: ++this.instanceCounter,
    });
  }
}
