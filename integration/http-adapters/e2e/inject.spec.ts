import type { INestApplication } from '@nestjs/common';
import { type NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { adapters, createApp } from '../src/adapters.js';
import { InjectModule } from '../src/inject/inject.module.js';
import { ResponsesModule } from '../src/responses/responses.module.js';

describe.each(adapters('fastify', 'node'))('inject() (%s)', name => {
  let app: INestApplication;
  // Both adapters type inject() the same way
  const inject: NestNodeApplication['inject'] = (...args: any[]) =>
    (app as any).inject(...args);

  beforeAll(async () => {
    app = await createApp(name, InjectModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should pass params, query and headers to the handler', async () => {
    const res = await inject({
      method: 'GET',
      url: '/inject/items/7?q=cats',
      headers: { 'x-token': 'abc' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: '7', q: 'cats', token: 'abc' });
  });

  it('should parse a JSON body', async () => {
    const res = await inject({
      method: 'POST',
      url: '/inject/echo',
      payload: { name: 'Tom' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ name: 'Tom' });
  });

  it('should send a streamed body', async () => {
    const res = await inject('/inject/stream');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/plain/);
    expect(res.body).toBe('one two three');
  });

  it('should answer with the exception the handler throws', async () => {
    const res = await inject({ method: 'GET', url: '/inject/missing' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'No such item',
    });
  });

  it('should answer a path with no route with 404', async () => {
    const res = await inject({ method: 'GET', url: '/inject/nowhere' });

    expect(res.statusCode).toBe(404);
  });

  it('should build a request with the chain API', async () => {
    const res = await inject()
      .post('/inject/echo')
      .headers({ 'content-type': 'application/json' })
      .payload(JSON.stringify([1, 2]))
      .end();

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual([1, 2]);
  });
});

describe('inject() (node, not listening)', () => {
  let app: NestNodeApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [InjectModule, ResponsesModule],
    }).compile();
    app = moduleRef.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
      { logger: false },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should answer without a listening server', async () => {
    const res = await app.inject('/inject/items/1?q=x');

    expect(app.getHttpServer().listening).toBe(false);
    expect(res.json()).toEqual({ id: '1', q: 'x' });
  });

  it('should send a file and a range of it', async () => {
    const file = await app.inject('/files/hello.txt');
    const range = await app.inject({
      method: 'GET',
      url: '/files/hello.txt',
      headers: { range: 'bytes=0-4' },
    });

    expect(file.statusCode).toBe(200);
    expect(range.statusCode).toBe(206);
    expect(range.body).toBe('hello');
  });

  it('should hand the errors of res.sendFile() to Nest', async () => {
    const res = await app.inject('/files/folder');

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      message: 'Cannot GET /files/folder',
      error: 'Not Found',
      statusCode: 404,
    });
  });
});
