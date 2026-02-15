import { EventSource } from 'eventsource';
import { createServer, OutgoingHttpHeaders } from 'http';
import { AddressInfo } from 'net';
import { Writable } from 'stream';
import { HeaderStream, SseStream } from '../../router/sse-stream.js';

const noop = () => {};

const written = (stream: Writable) =>
  new Promise((resolve, reject) =>
    stream.on('error', reject).on('finish', resolve),
  );

class Sink extends Writable implements HeaderStream {
  private readonly chunks: string[] = [];

  constructor(
    public readonly writeHead?: (
      statusCode: number,
      headers?: OutgoingHttpHeaders | string,
    ) => void,
  ) {
    super({ objectMode: true });
  }

  _write(
    chunk: any,
    encoding: string,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk);
    callback();
  }

  get content() {
    return this.chunks.join('');
  }
}

describe('SseStream', () => {
  it('writes multiple multiline messages', async () => {
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    sse.writeMessage(
      {
        data: 'hello\nworld',
      },
      noop,
    );
    sse.writeMessage(
      {
        data: 'bonjour\nmonde',
      },
      noop,
    );
    sse.end();
    await written(sink);

    expect(sink.content).toBe(
      `
id: 1
data: hello
data: world

id: 2
data: bonjour
data: monde

`,
    );
  });

  it('writes object messages as JSON', async () => {
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    sse.writeMessage(
      {
        data: { hello: 'world' },
      },
      noop,
    );
    sse.end();
    await written(sink);

    expect(sink.content).toBe(
      `
id: 1
data: {"hello":"world"}

`,
    );
  });

  it('writes all message attributes', async () => {
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    sse.writeMessage(
      {
        type: 'tea-time',
        id: 'the-id',
        retry: 222,
        data: 'hello',
      },
      noop,
    );
    sse.end();
    await written(sink);

    expect(sink.content).toBe(
      `
event: tea-time
id: the-id
retry: 222
data: hello

`,
    );
  });

  it('sets headers on destination when it looks like a HTTP Response', () =>
    new Promise<void>(callback => {
      const sse = new SseStream();
      const sink = new Sink(
        (status: number, headers: string | OutgoingHttpHeaders) => {
          expect(headers).toEqual({
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
            'Cache-Control':
              'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
            Pragma: 'no-cache',
            Expire: '0',
            'X-Accel-Buffering': 'no',
          });
          callback();
          return sink;
        },
      );
      sse.pipe(sink);
    }));

  it('sets additional headers when provided', () =>
    new Promise<void>(callback => {
      const sse = new SseStream();
      const sink = new Sink(
        (status: number, headers: string | OutgoingHttpHeaders) => {
          expect(headers).toHaveProperty('access-control-headers');
          expect(headers['access-control-headers']).toBe('some-cors-value');
          callback();
          return sink;
        },
      );

      sse.pipe(sink, {
        additionalHeaders: { 'access-control-headers': 'some-cors-value' },
      });
    }));

  it('sets custom status code when provided', () =>
    new Promise<void>(callback => {
      const sse = new SseStream();
      const sink = new Sink(
        (status: number, headers: string | OutgoingHttpHeaders) => {
          expect(status).toBe(404);
          callback();
          return sink;
        },
      );

      sse.pipe(sink, {
        statusCode: 404,
      });
    }));

  it('defaults to 200 status code when not provided', () =>
    new Promise<void>(callback => {
      const sse = new SseStream();
      const sink = new Sink(
        (status: number, headers: string | OutgoingHttpHeaders) => {
          expect(status).toBe(200);
          callback();
          return sink;
        },
      );

      sse.pipe(sink);
    }));

  it('allows an eventsource to connect', () =>
    new Promise<void>((resolve, reject) => {
      let sse: SseStream;
      const server = createServer((req, res) => {
        sse = new SseStream(req);
        sse.pipe(res);
      });

      server.listen(() => {
        const es = new EventSource(
          `http://localhost:${(server.address() as AddressInfo).port}`,
        );
        es.onmessage = e => {
          expect(e.data).toBe('hello');
          es.close();
          server.close(() => resolve());
        };
        es.onopen = () => sse.writeMessage({ data: 'hello' }, noop);
        es.onerror = e =>
          reject(new Error(`Error from EventSource: ${JSON.stringify(e)}`));
      });
    }));
});
