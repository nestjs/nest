import {
  CallHandler,
  Controller,
  ExecutionContext,
  Header,
  HttpStatus,
  Injectable,
  MessageEvent,
  Module,
  NestInterceptor,
  Res,
  Sse,
  UseInterceptors,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';

interface ReplyLike {
  header(name: string, value: string): unknown;
  status(statusCode: number): unknown;
}

const hello$ = of<MessageEvent>({ data: 'hello' });

@Injectable()
class ReplyHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    context
      .switchToHttp()
      .getResponse<ReplyLike>()
      .header('x-interceptor', 'set');
    return next.handle();
  }
}

@Injectable()
class ReplyContentTypeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    context
      .switchToHttp()
      .getResponse<ReplyLike>()
      .header('content-type', 'application/json');
    return next.handle();
  }
}

@Injectable()
class ReplyStatusInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    context.switchToHttp().getResponse<ReplyLike>().status(HttpStatus.ACCEPTED);
    return next.handle();
  }
}

@Controller('late-headers')
class LateHeadersController {
  @Sse('decorator')
  @Header('x-decorator', 'set')
  decorator(): Observable<MessageEvent> {
    return hello$;
  }

  @Sse('interceptor')
  @UseInterceptors(ReplyHeaderInterceptor)
  interceptor(): Observable<MessageEvent> {
    return hello$;
  }

  @Sse('handler')
  handler(@Res({ passthrough: true }) reply: ReplyLike) {
    reply.header('x-handler', 'set');
    return hello$;
  }

  @Sse('async-handler')
  async asyncHandler(@Res({ passthrough: true }) reply: ReplyLike) {
    await new Promise(resolve => setTimeout(resolve, 5));
    reply.status(HttpStatus.ACCEPTED);
    reply.header('x-async-handler', 'set');
    return hello$;
  }

  @Sse('header-content-type')
  @Header('Content-Type', 'application/json')
  headerContentType(): Observable<MessageEvent> {
    return hello$;
  }

  @Sse('content-type')
  @UseInterceptors(ReplyContentTypeInterceptor)
  contentType(): Observable<MessageEvent> {
    return hello$;
  }

  @Sse('status')
  @UseInterceptors(ReplyStatusInterceptor)
  status(): Observable<MessageEvent> {
    return hello$;
  }
}

@Module({ controllers: [LateHeadersController] })
export class LateHeadersModule {}
