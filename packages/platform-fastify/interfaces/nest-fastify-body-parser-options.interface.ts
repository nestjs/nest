import type { AddContentTypeParser } from 'fastify';

export type NestFastifyBodyParserOptions = Omit<
  Parameters<AddContentTypeParser>[1],
  'parseAs'
>;
