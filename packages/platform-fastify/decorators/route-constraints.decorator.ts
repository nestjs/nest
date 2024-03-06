import { SetMetadata } from '@nestjs/common';
import { FASTIFY_ROUTE_CONSTRAINTS_METADATA } from '../constants';
import { RouteShorthandOptions } from 'fastify';

/**
 * @publicApi
 *
 * @param config See {@link https://fastify.dev/docs/latest/Reference/Routes/#constraints}
 */
export const RouteConstraints = (config: RouteShorthandOptions['config']) =>
  SetMetadata(FASTIFY_ROUTE_CONSTRAINTS_METADATA, config);
