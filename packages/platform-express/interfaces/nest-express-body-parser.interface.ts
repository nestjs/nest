import express from 'express';

/**
 * Maps each body parser to the options object accepted by its Express factory.
 *
 * Derived from `express` itself so the two can never drift: `useBodyParser`
 * ultimately calls `express[parser](options)`.
 *
 * @publicApi
 */
export interface NestExpressBodyParserOptionsMap {
  json: NonNullable<Parameters<typeof express.json>[0]>;
  urlencoded: NonNullable<Parameters<typeof express.urlencoded>[0]>;
  text: NonNullable<Parameters<typeof express.text>[0]>;
  raw: NonNullable<Parameters<typeof express.raw>[0]>;
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
