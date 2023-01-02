import {
  ContextId,
  ContextIdResolver,
  ContextIdResolverFn,
  ContextIdStrategy,
  HostComponentInfo,
} from '@nestjs/core';
import { Request } from 'express';

const tenants = new Map<string, ContextId>();

export class DurableContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: Request): ContextIdResolver {
    const tenantId = request.headers['x-tenant-id'] as string;
    let tenantSubTreeId: ContextId;

    if (tenants.has(tenantId)) {
      tenantSubTreeId = tenants.get(tenantId);
    } else {
      tenantSubTreeId = { id: +tenantId } as ContextId;
      tenants.set(tenantId, tenantSubTreeId);
    }
    return {
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? tenantSubTreeId : contextId,
      payload: { tenantId },
    };
  }
}

export class DurableContextIdWithoutPayloadStrategy
  implements ContextIdStrategy
{
  attach(contextId: ContextId, request: Request): ContextIdResolverFn {
    const tenantId = request.headers['x-tenant-id'] as string;
    let tenantSubTreeId: ContextId;

    if (tenants.has(tenantId)) {
      tenantSubTreeId = tenants.get(tenantId);
    } else {
      tenantSubTreeId = { id: +tenantId } as ContextId;
      tenants.set(tenantId, tenantSubTreeId);
    }
    return (info: HostComponentInfo) =>
      info.isTreeDurable ? tenantSubTreeId : contextId;
  }
}
