/*
 * Nest @platform-fastify
 * Copyright(c) 2017 - 2023 Kamil Mysliwiec
 * https://nestjs.com
 * MIT Licensed
 */

export type {
  FastifyRequest as RequestFastify,
  FastifyReply as ResponseFastify,
} from 'fastify';

export * from './adapters';
export * from './interfaces';
