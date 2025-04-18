import { SetMetadata } from '@nestjs/common';
import { FASTIFY_SCHEMA_METADATA } from '../constants';

export const Schema = (schema: {
  body?: Record<string, unknown>;
  querystring?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  response?: Record<number, any>;
}) => SetMetadata(FASTIFY_SCHEMA_METADATA, schema);
