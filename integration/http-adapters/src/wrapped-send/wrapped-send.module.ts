import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  type MiddlewareConsumer,
  Module,
  type NestMiddleware,
  type NestModule,
  NotFoundException,
} from '@nestjs/common';

/**
 * The bodies the wrapped `res.send()` was called with.
 */
export const sentBodies: unknown[] = [];

/**
 * Wraps `res.send()` and `res.json()`, as middleware written for Express does
 * to log the body or to reshape it.
 */
@Injectable()
export class WrapSendMiddleware implements NestMiddleware {
  use(req: unknown, res: any, next: () => void) {
    const { send, json } = res;
    res.send = function (body?: unknown) {
      sentBodies.push(body);
      return send.call(this, body);
    };
    res.json = function (body: unknown) {
      return json.call(this, { data: body });
    };
    next();
  }
}

@Controller('wrapped')
export class WrappedSendController {
  @Get('object')
  object() {
    return { hello: 'world' };
  }

  @Get('text')
  text() {
    return 'plain';
  }

  @Get('missing')
  missing() {
    throw new NotFoundException('Missing');
  }

  @Delete('item')
  @HttpCode(204)
  remove() {}
}

@Module({ controllers: [WrappedSendController] })
export class WrappedSendModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WrapSendMiddleware).forRoutes(WrappedSendController);
  }
}
