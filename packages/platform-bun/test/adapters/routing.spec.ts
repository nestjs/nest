import {
  All,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Head,
  Header,
  HttpCode,
  HttpStatus,
  Ip,
  Module,
  Next,
  NotFoundException,
  Options,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Redirect,
  Req,
  Res,
  Headers as ReqHeaders,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import type { BunRequest, BunResponse } from '../../index.js';
import { bootstrap, isBun, jsonInit, type TestApp } from './helpers.js';

interface CreateUser {
  name: string;
  age?: number;
}

// Minimal Standard Schema (https://standardschema.dev): name required, age coerced to an integer.
const createUser = {
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate(input: any) {
      if (!input || typeof input.name !== 'string' || input.name.length === 0) {
        return { issues: [{ message: 'name is required', path: ['name'] }] };
      }
      const value: CreateUser = { name: input.name };
      if (input.age !== undefined) {
        const age = Number(input.age);
        if (!Number.isInteger(age)) {
          return {
            issues: [{ message: 'age must be an integer', path: ['age'] }],
          };
        }
        value.age = age;
      }
      return { value };
    },
  },
};

@Controller('users')
class UsersController {
  @Get()
  list(@Query() query: Record<string, unknown>) {
    return { users: [], query };
  }

  @Post()
  create(@Body({ schema: createUser }) body: CreateUser) {
    return { created: body };
  }

  @Head('ping')
  head() {
    return undefined;
  }

  @Options('opt')
  @Header('Allow', 'GET, POST')
  options() {
    return '';
  }

  @Get('redirect/me')
  @Redirect('https://example.com', 301)
  redirect() {
    return undefined;
  }

  @Get('redirect/dynamic')
  @Redirect()
  redirectDynamic() {
    return { url: '/users', statusCode: 303 };
  }

  @Get('raw/json')
  raw(@Res() res: BunResponse) {
    res.status(202).set('x-raw', 'yes').json({ raw: true });
  }

  @Get('raw/passthrough')
  passthrough(@Res({ passthrough: true }) res: BunResponse) {
    res.set('x-pass', '1');
    return { pass: true };
  }

  @Get('raw/next')
  next(@Next() next: () => void) {
    next();
  }

  @Get('raw/next')
  afterNext() {
    return { second: true };
  }

  @Get('meta/headers')
  headers(
    @ReqHeaders('x-custom') custom: string,
    @Ip() ip: string,
    @Req() req: BunRequest,
  ) {
    return {
      custom,
      ip,
      method: req.method,
      url: req.originalUrl,
      hostname: req.hostname,
    };
  }

  @Get('boom')
  boom(): never {
    throw new Error('kaboom');
  }

  @Get('bad')
  bad(): never {
    throw new BadRequestException({ code: 'X', reason: 'custom body' });
  }

  @Get('primitive/number')
  num() {
    return 42;
  }

  @Get('primitive/bool')
  bool() {
    return false;
  }

  @Get('primitive/buffer')
  buf() {
    return Buffer.from('bytes');
  }

  @Get('wild/*rest')
  wildcard(@Param('rest') rest: string) {
    return { rest };
  }

  @All('any')
  any(@Req() req: BunRequest) {
    return { method: req.method };
  }

  // Param routes last: first match wins, exactly like Express.
  @Get(':id')
  one(@Param('id') id: string) {
    if (id === 'missing') {
      throw new NotFoundException(`User ${id} not found`);
    }
    return { id };
  }

  @Get(':id/posts/:postId')
  nested(@Param() params: Record<string, string>) {
    return params;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  replace(@Param('id') id: string, @Body() body: unknown) {
    return { id, body };
  }

  @Patch(':id')
  patch(@Param('id') id: string) {
    return `patched ${id}`;
  }

  @Delete(':id')
  @HttpCode(204)
  remove() {
    return undefined;
  }
}

@Module({ controllers: [UsersController] })
class AppModule {}

describe('routing', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootstrap(AppModule, {
      configure: app => app.useGlobalPipes(new StandardSchemaValidationPipe()),
    });
  });
  afterAll(() => t.close());

  it('should parse the query string (repeated keys become arrays)', async () => {
    const r = await t.json('/users?limit=5&tag=a&tag=b');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(r.body).toEqual({
      users: [],
      query: { limit: '5', tag: ['a', 'b'] },
    });
  });

  it('should decode nested route params', async () => {
    expect((await t.json('/users/abc')).body).toEqual({ id: 'abc' });
    expect((await t.json('/users/a%20b/posts/9')).body).toEqual({
      id: 'a b',
      postId: '9',
    });
  });

  it('should return 201 on POST and validate the body', async () => {
    const ok = await t.json(
      '/users',
      jsonInit('POST', { name: 'Ada', age: '36' }),
    );
    expect(ok.status).toBe(201);
    expect(ok.body).toEqual({ created: { name: 'Ada', age: 36 } });

    const bad = await t.json('/users', jsonInit('POST', { name: '' }));
    expect(bad.status).toBe(400);
    expect(bad.body.statusCode).toBe(400);
    expect(bad.body.message[0]).toContain('name');
  });

  it('should handle PUT/PATCH/DELETE with @HttpCode', async () => {
    const put = await t.json('/users/1', jsonInit('PUT', { a: 1 }));
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ id: '1', body: { a: 1 } });

    const patch = await t.fetch('/users/7', { method: 'PATCH' });
    expect(patch.status).toBe(200);
    expect(patch.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await patch.text()).toBe('patched 7');

    const del = await t.fetch('/users/1', { method: 'DELETE' });
    expect(del.status).toBe(204);
    expect(await del.text()).toBe('');
  });

  it('should serve HEAD routes and fall back from HEAD to GET', async () => {
    const head = await t.fetch('/users/ping', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');

    const headGet = await t.fetch('/users/abc', { method: 'HEAD' });
    expect(headGet.status).toBe(200);
    expect(headGet.headers.get('content-length')).toBe(
      String(JSON.stringify({ id: 'abc' }).length),
    );
    expect(await headGet.text()).toBe('');
  });

  it('should serve OPTIONS with @Header', async () => {
    const r = await t.fetch('/users/opt', { method: 'OPTIONS' });
    expect(r.status).toBe(200);
    expect(r.headers.get('allow')).toBe('GET, POST');
  });

  it('should support static and dynamic @Redirect', async () => {
    const r = await t.fetch('/users/redirect/me', { redirect: 'manual' });
    expect(r.status).toBe(301);
    expect(r.headers.get('location')).toBe('https://example.com');

    const d = await t.fetch('/users/redirect/dynamic', { redirect: 'manual' });
    expect(d.status).toBe(303);
    expect(d.headers.get('location')).toBe('/users');
  });

  it('should support raw @Res, passthrough and @Next', async () => {
    const raw = await t.json('/users/raw/json');
    expect(raw.status).toBe(202);
    expect(raw.headers.get('x-raw')).toBe('yes');
    expect(raw.body).toEqual({ raw: true });

    const pass = await t.json('/users/raw/passthrough');
    expect(pass.headers.get('x-pass')).toBe('1');
    expect(pass.body).toEqual({ pass: true });

    expect((await t.json('/users/raw/next')).body).toEqual({ second: true });
  });

  it('should support the request metadata decorators', async () => {
    const r = await t.json('/users/meta/headers?x=1', {
      headers: { 'x-custom': 'hello' },
    });
    expect(r.body.custom).toBe('hello');
    expect(r.body.method).toBe('GET');
    expect(r.body.url).toBe('/users/meta/headers?x=1');
    expect(r.body.hostname).toMatch(/^(127\.0\.0\.1|localhost|::1)$/);
    // In-process requests have no socket, so no remote address.
    expect(typeof r.body.ip).toBe(isBun ? 'string' : 'undefined');
  });

  it('should shape HttpExceptions, unknown errors and 404s', async () => {
    const nf = await t.json('/users/missing');
    expect(nf.status).toBe(404);
    expect(nf.body).toEqual({
      statusCode: 404,
      message: 'User missing not found',
      error: 'Not Found',
    });

    const boom = await t.json('/users/boom');
    expect(boom.status).toBe(500);
    expect(boom.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });

    const bad = await t.json('/users/bad');
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ code: 'X', reason: 'custom body' });

    const unknown = await t.json('/nope');
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual({
      statusCode: 404,
      message: 'Cannot GET /nope',
      error: 'Not Found',
    });
  });

  it('should send primitive and buffer bodies', async () => {
    const n = await t.fetch('/users/primitive/number');
    expect(await n.text()).toBe('42');
    expect(n.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await (await t.fetch('/users/primitive/bool')).text()).toBe('false');
    const b = await t.fetch('/users/primitive/buffer');
    expect(await b.text()).toBe('bytes');
  });

  it('should support wildcards and @All', async () => {
    expect((await t.json('/users/wild/a/b/c')).body).toEqual({
      rest: ['a', 'b', 'c'],
    });
    expect((await t.json('/users/any', { method: 'PUT' })).body).toEqual({
      method: 'PUT',
    });
  });
});
