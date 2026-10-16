import { Controller, Get, Module, Query, Redirect } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

@Controller()
class RedirectController {
  @Get('old')
  @Redirect('/new')
  redirect(@Query('to') to?: string) {
    return to ? { url: to } : undefined;
  }
}

@Module({ controllers: [RedirectController] })
class RedirectModule {}

describe('@Redirect() (fastify adapter)', () => {
  let app: NestFastifyApplication;
  let onSendCalls: number;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RedirectModule],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    onSendCalls = 0;
    // A hook that settles on a later turn of the event loop, as hooks that do
    // I/O (e.g. a session store) do.
    app
      .getHttpAdapter()
      .getInstance()
      .addHook('onSend', async (_request, _reply, payload) => {
        onSendCalls++;
        await new Promise(resolve => setImmediate(resolve));
        return payload;
      });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should send the redirect once with an asynchronous onSend hook', async () => {
    const response = await app.inject({ method: 'GET', url: '/old' });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/new');
    expect(onSendCalls).toBe(1);
  });

  it('should answer a redirect to a url that is not a valid header value with 500', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/old?to=${encodeURIComponent('/€')}`,
    });
    expect(response.statusCode).toBe(500);

    // A second reply would fail on a later turn of the event loop, with a
    // rejection nothing handles.
    await new Promise(resolve => setTimeout(resolve, 10));
    const next = await app.inject({ method: 'GET', url: '/old' });
    expect(next.statusCode).toBe(302);
  });
});
