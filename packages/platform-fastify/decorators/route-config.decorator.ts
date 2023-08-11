import { SetMetadata } from '@nestjs/common';
import { FASTIFY_ROUTE_CONFIG_METADATA } from '../constants';

/**
 * @param config See {@link https://fastify.dev/docs/latest/Reference/Routes/#config}
 */
export const RouteConfig = (config: any) =>
  SetMetadata(FASTIFY_ROUTE_CONFIG_METADATA, config);
