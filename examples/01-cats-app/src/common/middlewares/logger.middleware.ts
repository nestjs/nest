import { Injectable, NestMiddleware, ExpressMiddleware } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  resolve(context: string): ExpressMiddleware {
    return (req, res, next) => {
      console.log(`[${context}] Request...`);
      next();
    };
  }
}
