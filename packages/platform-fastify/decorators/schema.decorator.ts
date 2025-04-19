import { SetMetadata } from '@nestjs/common';
import { FASTIFY_SCHEMA_METADATA } from '../constants';
import { RouteShorthandOptions } from 'fastify';

/**
 * @publicApi
 *
 * @param schema See {@link https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/}
 */
export const Schema = (schema: RouteShorthandOptions['schema']) =>
  SetMetadata(FASTIFY_SCHEMA_METADATA, schema);
