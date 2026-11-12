import {
  ArgumentsHost,
  BadRequestException,
  CallHandler,
  CanActivate,
  Catch,
  Controller,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  HttpStatus,
  INestApplication,
  Injectable,
  Module,
  NestInterceptor,
  PipeTransform,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import {
  ClientTCP,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as net from 'net';
import { defer, firstValueFrom, throwError, timeout } from 'rxjs';

// The two catch-everything filters of the exception filters chapter. On RPC,
// getResponse() is the TcpContext, so replying through the adapter throws.
@Catch()
class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}

@Catch()
class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
  }
}

@Catch()
class RpcStyleFilter implements ExceptionFilter {
  catch(exception: unknown) {
    const message =
      exception instanceof RpcException ? exception.getError() : 'filtered';
    return throwError(() =>
      typeof message === 'string' ? { status: 'error', message } : message,
    );
  }
}

class DenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable()
class BoomPipe implements PipeTransform {
  transform() {
    throw new BadRequestException('pipe');
  }
}

// With an interceptor bound, the handler runs inside the response stream, so
// its error reaches the filters from there rather than from its promise
@Injectable()
class PassThroughInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

@Controller()
class Svc {
  @MessagePattern('ok')
  ok(@Payload() data: { n: number }) {
    return { n: data.n + 1 };
  }

  @MessagePattern('throw')
  throw() {
    throw new Error('boom');
  }

  @MessagePattern('async')
  async asyncThrow() {
    throw new Error('async boom');
  }

  @MessagePattern('reject')
  reject() {
    return Promise.reject(new Error('rejected'));
  }

  @MessagePattern('http')
  http() {
    throw new BadRequestException('bad input');
  }

  @MessagePattern('rpc')
  rpc() {
    throw new RpcException('nope');
  }

  @UseGuards(DenyGuard)
  @MessagePattern('guard')
  guard() {
    return 'nope';
  }

  @UsePipes(BoomPipe)
  @MessagePattern('pipe')
  pipe(@Payload() data: unknown) {
    return data;
  }

  @UseFilters(RpcStyleFilter)
  @MessagePattern('rpc-filter')
  rpcFilter() {
    throw new RpcException('kept');
  }

  @UseInterceptors(PassThroughInterceptor)
  @MessagePattern('intercepted')
  intercepted() {
    throw new Error('intercepted boom');
  }

  @MessagePattern('stream')
  stream() {
    return defer(() => throwError(() => new Error('stream boom')));
  }
}

@Module({ controllers: [Svc] })
class AppModule {}

const UNKNOWN_ERROR = { status: 'error', message: 'Internal server error' };

/**
 * A hybrid application whose TCP microservice inherits a global HTTP
 * exception filter (`inheritAppConfig`). The filter throws on the RPC
 * context, and the request must still be answered.
 */
describe('Inherited HTTP exception filter (TCP)', () => {
  let app: INestApplication | undefined;
  let client: ClientTCP | undefined;

  afterEach(async () => {
    await client?.close();
    client = undefined;
    await app?.close();
    app = undefined;
  });

  async function connect(
    createFilter: (app: INestApplication) => ExceptionFilter,
  ) {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(createFilter(app));
    const microservice = app.connectMicroservice<MicroserviceOptions>(
      {
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 0 },
      },
      { inheritAppConfig: true },
    );
    await app.startAllMicroservices();
    await app.init();
    const { port } = microservice
      .unwrap<net.Server>()
      .address() as net.AddressInfo;

    client = new ClientTCP({ host: '127.0.0.1', port });
    await client.connect();
  }

  function call(pattern: string, data: unknown = { n: 1 }) {
    return firstValueFrom(client!.send(pattern, data).pipe(timeout(1000)));
  }

  async function expectEveryRequestAnswered() {
    await expect(call('ok')).resolves.toEqual({ n: 2 });
    await expect(call('throw')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('async')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('reject')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('http')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('rpc')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('guard')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('pipe')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('intercepted')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('stream')).rejects.toEqual(UNKNOWN_ERROR);
    await expect(call('rpc-filter')).rejects.toEqual({
      status: 'error',
      message: 'kept',
    });
    await expect(call('ok', { n: 4 })).resolves.toEqual({ n: 5 });
  }

  it('answers the requests an inherited CatchEverythingFilter cannot', async () => {
    await connect(app => new CatchEverythingFilter(app.get(HttpAdapterHost)));
    await expectEveryRequestAnswered();
  });

  it('answers the requests an inherited AllExceptionsFilter cannot', async () => {
    await connect(
      app => new AllExceptionsFilter(app.get(HttpAdapterHost).httpAdapter),
    );
    await expectEveryRequestAnswered();
  });
});
