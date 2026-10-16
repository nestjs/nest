import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * Answers the request itself, as a proxy or a webhook receiver would.
 */
@Injectable()
export class AnswerMiddleware implements NestMiddleware {
  use(_req: unknown, res: { end(body: string): void }) {
    res.end('answered by middleware');
  }
}
