import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    req.middlewareApplied = true;
    next();
  }
}

export function functionalMiddleware(req: any, res: any, next: () => void) {
  req.functionalMiddlewareApplied = true;
  next();
}
