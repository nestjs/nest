import { Inject, Injectable, Optional } from '@nestjs/common';
import { DurableElephantsService } from './durable-elephants.service.js';
import {
  TENANT_CONNECTION,
  TenantConnection,
} from './durable-tenant-connection.provider.js';

/**
 * Plain consumer of the cross-module cycle, hosted in a third module
 * (DurableZooModule). The absent optional dependency keeps the ctor
 * metadata sparse, so every request resolves through the slow path that
 * forwards the consumer's moduleRef to `resolveComponentHost`.
 */
@Injectable()
export class DurableZooService {
  constructor(
    @Inject(TENANT_CONNECTION)
    private readonly connection: TenantConnection,
    private readonly elephantsService: DurableElephantsService,
    @Optional()
    @Inject('ZOO_KEEPER')
    private readonly zooKeeper?: unknown,
  ) {}

  visit() {
    return {
      constructorCalled: !!this.connection,
      tenantId: this.connection?.tenantId,
      elephant: this.elephantsService.trumpet(),
    };
  }
}
