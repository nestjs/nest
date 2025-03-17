import { SetMetadata } from '@nestjs/common';
import { FASTIFY_ROUTE_SCHEMA_METADATA } from '../constants';
import { FastifySchema } from 'fastify';

/**
 * @publicApi
 *
 * @param schema See {@link https://fastify.dev/docs/latest/Reference/Routes/#routes-options}
 */
export const RouteSchema = (schema: FastifySchema) =>
  SetMetadata(FASTIFY_ROUTE_SCHEMA_METADATA, schema);
