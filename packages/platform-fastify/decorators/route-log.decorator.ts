import { SetMetadata } from '@nestjs/common';
import { FASTIFY_ROUTE_LOG_METADATA } from '../constants';
import { LogLevel } from 'fastify';

/**
 * @publicApi
 *
 * @param config See {@link https://fastify.dev/docs/latest/Reference/Routes/#custom-log-level}
 */
export const RouteLog = (config: { logLevel: LogLevel }) =>
  SetMetadata(FASTIFY_ROUTE_LOG_METADATA, config);
