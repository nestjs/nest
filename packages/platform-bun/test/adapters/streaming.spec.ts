import {
  Controller,
  Get,
  Module,
  Res,
  Sse,
  StreamableFile,
  MessageEvent,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { interval, map, take, Observable } from 'rxjs';
import type { BunResponse } from '../../index.js';
import { bootstrap, type TestApp } from './helpers.js';

@Controller('stream')
class StreamController {
  @Get('file')
  file() {
    return new StreamableFile(
      Readable.from([Buffer.from('hello '), Buffer.from('world')]),
      {
        type: 'text/plain',
        disposition: 'attachment; filename="hi.txt"',
        length: 11,
      },
    );
  }

  @Get('manual')
  manual(@Res() res: BunResponse) {
    res.status(200).setHeader('content-type', 'text/plain');
    res.write('a');
    setTimeout(() => {
      res.write('b');
      res.end('c');
    }, 10);
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return interval(5).pipe(
      take(3),
      map(i => ({ data: { tick: i }, type: 'tick', id: String(i) })),
    );
  }

  @Get('big')
  big() {
    return { blob: 'x'.repeat(2 * 1024 * 1024) };
  }
}
@Module({ controllers: [StreamController] })
class StreamModule {}

describe('streaming', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootstrap(StreamModule);
  });
  afterAll(() => t.close());

  it('should pipe StreamableFile with its headers', async () => {
    const r = await t.fetch('/stream/file');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/plain');
    expect(r.headers.get('content-disposition')).toBe(
      'attachment; filename="hi.txt"',
    );
    expect(r.headers.get('content-length')).toBe('11');
    expect(await r.text()).toBe('hello world');
  });

  it('should support manual res.write() streaming', async () => {
    const r = await t.fetch('/stream/manual');
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('abc');
  });

  it('should serve Server-Sent Events and complete', async () => {
    const r = await t.fetch('/stream/events');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/event-stream');
    expect(r.headers.get('cache-control')).toContain('no-cache');
    const text = await r.text();
    expect(text).toContain('event: tick');
    expect(text).toContain('data: {"tick":0}');
    expect(text).toContain('data: {"tick":2}');
    expect(text.match(/^id: /gm)?.length).toBe(3);
  });

  it('should handle multi-megabyte JSON bodies', async () => {
    const r = await t.json('/stream/big');
    expect(r.status).toBe(200);
    expect(r.body.blob.length).toBe(2 * 1024 * 1024);
  });
});
