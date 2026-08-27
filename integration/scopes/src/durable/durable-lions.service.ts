import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DurableElephantsService } from './durable-elephants.service.js';
import {
  TENANT_CONNECTION,
  TenantConnection,
} from './durable-tenant-connection.provider.js';

@Injectable()
export class DurableLionsService {
  constructor(
    @Inject(TENANT_CONNECTION)
    private readonly connection: TenantConnection,
    @Inject(forwardRef(() => DurableElephantsService))
    private readonly elephantsService: DurableElephantsService,
  ) {}

  roar() {
    return `roar from ${this.connection.tenantId}`;
  }
}
