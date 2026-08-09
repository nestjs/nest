type Express = typeof import('express');

/**
 * Maps each body parser to the options object accepted by its Express factory.
 *
 * Derived from `express` itself so the two can never drift: `useBodyParser`
 * ultimately calls `express[parser](options)`.
 *
 * @publicApi
 */
export interface NestExpressBodyParserOptionsMap {
  json: NonNullable<Parameters<Express['json']>[0]>;
  urlencoded: NonNullable<Parameters<Express['urlencoded']>[0]>;
  text: NonNullable<Parameters<Express['text']>[0]>;
  raw: NonNullable<Parameters<Express['raw']>[0]>;
}

/**
 * Interface defining possible body parser types, to be used with `NestExpressApplication.useBodyParser()`.
 */
export type NestExpressBodyParserType = keyof NestExpressBodyParserOptionsMap;

/**
 * Options accepted by a given body parser.
 *
 * `verify` is excluded because it is reserved: Nest sets it internally to
 * capture the raw request body when the application is created with
 * `{ rawBody: true }`.
 *
 * @publicApi
 */
export type NestExpressBodyParserOptionsFor<
  ParserType extends NestExpressBodyParserType,
> = Omit<NestExpressBodyParserOptionsMap[ParserType], 'verify'>;
