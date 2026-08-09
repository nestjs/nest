import type { RawBodyRequest } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';
import type {
  NestExpressBodyParserOptionsFor,
  NestExpressBodyParserOptionsMap,
  NestExpressBodyParserType,
} from '../../interfaces/index.js';

const rawBodyParser = (
  req: RawBodyRequest<IncomingMessage>,
  _res: ServerResponse,
  buffer: Buffer,
) => {
  if (Buffer.isBuffer(buffer)) {
    req.rawBody = buffer;
  }
  return true;
};

export function getBodyParserOptions<
  ParserType extends NestExpressBodyParserType,
>(
  parser: ParserType,
  rawBody: boolean,
  options?: NestExpressBodyParserOptionsFor<ParserType>,
): NestExpressBodyParserOptionsMap[ParserType] {
  if (rawBody === true) {
    return {
      ...options,
      verify: rawBodyParser,
    };
  }

  return options || {};
}
