import { ContextId, ContextIdStrategy, HostComponentInfo } from '@nestjs/core';
import { Request } from 'express';

export type TenantContext = {
  tenantId: string;
  forceError?: boolean;
};

const tenants = new Map<string, ContextId>();

export class DurableContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: Request) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const forceError = request.headers['x-force-error'] === 'true';

    let tenantSubTreeId: ContextId;

    if (tenants.has(tenantId)) {
      tenantSubTreeId = tenants.get(tenantId)!;
    } else {
      tenantSubTreeId = { id: +tenantId } as ContextId;
      tenants.set(tenantId, tenantSubTreeId);
    }

    const payload: TenantContext = { tenantId };
    if (forceError) {
      payload.forceError = true;
    }
    return {
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? tenantSubTreeId : contextId,
      payload,
    };
  }
}
