import {
  Controller,
  Get,
  type INestApplication,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  Options,
  RequestMethod,
} from '@nestjs/common';
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'net';
import { connect } from 'net';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const MIDDLEWARE_RETURN_VALUE = 'middleware_return';
const HANDLER_RETURN_VALUE = 'handler_return';

@Controller('users')
class UsersController {
  @Get()
  findAll() {
    return HANDLER_RETURN_VALUE;
  }
}

@Controller()
class RootController {
  @Options()
  options() {
    return 'root options';
  }
}

@Module({
  controllers: [UsersController, RootController],
})
class RequestTargetModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_RETURN_VALUE))
      .forRoutes({ path: 'users', method: RequestMethod.GET });
  }
}

// As in middleware-fastify.spec.ts: a route never runs without the middleware
// mounted on its path, whatever form the request target takes.
describe('Request target forms (NodeAdapter)', () => {
  let app: INestApplication;
  let port: number;

  /**
   * "supertest" always sends origin-form request targets, so the request has
   * to be written to the socket manually.
   */
  const sendRawRequest = (requestTarget: string, method = 'GET') =>
    new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      let response = '';
      const socket = connect(port, '127.0.0.1', () => {
        socket.write(
          `${method} ${requestTarget} HTTP/1.1\r\n` +
            `Host: 127.0.0.1:${port}\r\n` +
            `Connection: close\r\n\r\n`,
        );
      });
      socket.setEncoding('utf8');
      socket.on('data', chunk => (response += chunk));
      socket.on('error', reject);
      socket.on('end', () => {
        const [head, body = ''] = response.split('\r\n\r\n');
        resolve({ statusCode: Number(head.split(' ')[1]), body });
      });
    });

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [RequestTargetModule],
      }).compile()
    ).createNestApplication(new NodeAdapter());

    await listenOnLoopback(app);
    port = (app.getHttpServer().address() as AddressInfo).port;
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs middleware for an origin-form request target', async () => {
    const response = await sendRawRequest('/users');
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(MIDDLEWARE_RETURN_VALUE);
  });

  it('does not bypass middleware with an absolute-form request target', async () => {
    const response = await sendRawRequest(`http://127.0.0.1:${port}/users`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(MIDDLEWARE_RETURN_VALUE);
  });

  it('does not run the route without its middleware for a request target starting with "*"', async () => {
    const response = await sendRawRequest('*users');
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Cannot GET *users',
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('answers "OPTIONS *" with the not-found handler', async () => {
    const response = await sendRawRequest('*', 'OPTIONS');
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Cannot OPTIONS *',
      error: 'Not Found',
      statusCode: 404,
    });
  });
});
