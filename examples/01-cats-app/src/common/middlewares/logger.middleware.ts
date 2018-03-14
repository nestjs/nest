import { Injectable, NestMiddleware, FunctionMiddleware } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  resolve(context: string): FunctionMiddleware {
    return (req, res, next) => {
      console.log(`[${context}] Request...`);
      next();
    };
  }
}
