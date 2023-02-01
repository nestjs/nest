import type { Options } from 'body-parser';

export type NestExpressBodyParserOptions<T extends Options = Options> = Omit<
  T,
  'verify'
>;
