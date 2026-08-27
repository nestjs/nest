import { Provider, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantContext } from './durable-context-id.strategy.js';

export const TENANT_CONNECTION = 'TENANT_CONNECTION';

export interface TenantConnection {
  tenantId: string;
}

/**
 * Request-scoped durable factory (a per-tenant "connection"). The services
 * consuming it stay default-scoped and become durable only transitively —
 * which means they DO get loaded during static bootstrap, so their static
 * instance host carries a settled `donePromise` that durable clones inherit.
 */
export const tenantConnectionProvider: Provider = {
  provide: TENANT_CONNECTION,
  scope: Scope.REQUEST,
  durable: true,
  useFactory: (payload: TenantContext): TenantConnection => ({
    tenantId: payload.tenantId,
  }),
  inject: [REQUEST],
};
