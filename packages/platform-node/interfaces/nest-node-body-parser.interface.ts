import type {
  NodeBodyParserOptions,
  NodeJsonParserOptions,
  NodeTextParserOptions,
  NodeUrlencodedParserOptions,
} from '../body-parser/body-parser.js';

/**
 * Options of each body parser that `useBodyParser()` accepts.
 *
 * @publicApi
 */
export interface NestNodeBodyParserOptionsMap {
  json: NodeJsonParserOptions;
  urlencoded: NodeUrlencodedParserOptions;
  text: NodeTextParserOptions;
  raw: NodeBodyParserOptions;
}

/**
 * @publicApi
 */
export type NestNodeBodyParserType = keyof NestNodeBodyParserOptionsMap;

/**
 * @publicApi
 */
export type NestNodeBodyParserOptionsFor<
  ParserType extends NestNodeBodyParserType,
> = Omit<NestNodeBodyParserOptionsMap[ParserType], 'verify'>;

export type {
  NodeBodyParserOptions,
  NodeJsonParserOptions,
  NodeTextParserOptions,
  NodeUrlencodedParserOptions,
};
