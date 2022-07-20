import type { RawBodyRequest } from '@nestjs/common';
import type { Options } from 'body-parser';
import type { IncomingMessage, ServerResponse } from 'http';

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

export function getBodyParserOptions<ParserOptions extends Options>(
  rawBody: boolean,
  options?: ParserOptions | undefined,
): ParserOptions {
  let parserOptions: ParserOptions = options ?? ({} as ParserOptions);

  if (rawBody === true) {
    parserOptions = {
      ...parserOptions,
      verify: rawBodyParser,
    };
  }

  return parserOptions;
}
