import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DurableLionsService } from './durable-lions.service.js';
import {
  TENANT_CONNECTION,
  TenantConnection,
} from './durable-tenant-connection.provider.js';

/**
 * One half of a forwardRef cycle that spans two modules:
 * `DurableElephantsService` (DurableElephantsModule) <->
 * `DurableLionsService` (DurableLionsModule).
 *
 * Deliberately default-scoped: the tree becomes durable transitively via
 * TENANT_CONNECTION. Regression fixture for the deferred forwardRef load
 * resolving the provider against the consumer's module instead of the
 * provider's host module (follow-up to issue #17562).
 */
@Injectable()
export class DurableElephantsService {
  constructor(
    @Inject(TENANT_CONNECTION)
    private readonly connection: TenantConnection,
    @Inject(forwardRef(() => DurableLionsService))
    private readonly lionsService: DurableLionsService,
  ) {}

  trumpet() {
    return `trumpet from ${this.connection.tenantId}, lion says ${this.lionsService.roar()}`;
  }
}
