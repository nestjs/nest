import { Injectable, SetMetadata } from '@nestjs/common';
import { TRPC_ROUTER_METADATA } from '../constants';
import { TrpcRouterMetadata } from '../interfaces';

/**
 * Marks a class as a tRPC router.
 *
 * The class will be scanned for `@Query()`, `@Mutation()`, and `@Subscription()` methods,
 * which become tRPC procedures on the merged router.
 *
 * @param alias - Optional prefix that nests all procedures under a sub-router.
 *
 * @publicApi
 */
export function Router(alias?: string): ClassDecorator {
  const metadata: TrpcRouterMetadata = { alias };
  return (target: Function) => {
    Injectable()(target);
    SetMetadata(TRPC_ROUTER_METADATA, metadata)(target);
  };
}
