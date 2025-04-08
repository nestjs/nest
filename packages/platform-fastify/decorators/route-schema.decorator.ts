import { SetMetadata } from '@nestjs/common';
import { FASTIFY_ROUTE_SCHEMA_METADATA } from '../constants';
import { FastifySchema } from 'fastify';

/**
 * @publicApi
 * Allows setting the schema for the route. Schema is an object that can contain the following properties:
 * - body: JsonSchema
 * - querystring or query: JsonSchema
 * - params: JsonSchema
 * - response: Record<HttpStatusCode, JsonSchema>
 * @param schema See {@link https://fastify.dev/docs/latest/Reference/Routes/#routes-options}
 */
export const RouteSchema = (schema: FastifySchema) =>
  SetMetadata(FASTIFY_ROUTE_SCHEMA_METADATA, schema);
