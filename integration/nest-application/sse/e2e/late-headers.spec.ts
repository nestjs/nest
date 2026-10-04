import { INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { LateHeadersModule } from '../src/late-headers.module.js';

const adapters = [
  ['Express', () => new ExpressAdapter()],
  ['Fastify', () => new FastifyAdapter()],
] as const;

describe.each(adapters)('Sse late headers (%s)', (_name, createAdapter) => {
  let app: INestApplication;
  let abortController: AbortController;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [LateHeadersModule],
    }).compile();
    app = moduleFixture.createNestApplication(createAdapter());
    abortController = new AbortController();
    await app.listen(0);
  });

  afterEach(async () => {
    abortController.abort();
    await app.close();
  });

  const openStream = async (route: string) =>
    fetch(`${await app.getUrl()}/late-headers/${route}`, {
      signal: abortController.signal,
    });

  it('sends a header set with @Header()', async () => {
    const response = await openStream('decorator');

    expect(response.headers.get('x-decorator')).toBe('set');
  });

  it('sends a header that an interceptor sets on the reply', async () => {
    const response = await openStream('interceptor');

    expect(response.headers.get('x-interceptor')).toBe('set');
  });

  it('sends a header that the handler sets on the reply', async () => {
    const response = await openStream('handler');

    expect(response.headers.get('x-handler')).toBe('set');
  });

  it('keeps the event stream content type over one that an interceptor sets', async () => {
    const response = await openStream('content-type');

    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });

  it('sends the status code that an interceptor sets on the reply', async () => {
    const response = await openStream('status');

    expect(response.status).toBe(202);
  });

  it('sends the status and header that an async handler sets before returning the stream', async () => {
    const response = await openStream('async-handler');

    expect(response.status).toBe(202);
    expect(response.headers.get('x-async-handler')).toBe('set');
  });

  it('keeps the event stream content type over one set with @Header()', async () => {
    const response = await openStream('header-content-type');

    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });
});
