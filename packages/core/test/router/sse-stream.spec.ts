import { expect } from 'chai';
import { EventSource } from 'eventsource';
import { createServer, OutgoingHttpHeaders } from 'http';
import { AddressInfo } from 'net';
import { Writable } from 'stream';
import { HeaderStream, SseStream } from '../../router/sse-stream';

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

    expect(sink.content).to.equal(
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

    expect(sink.content).to.equal(
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

    expect(sink.content).to.equal(
      `
event: tea-time
id: the-id
retry: 222
data: hello

`,
    );
  });

  it('does not write headers eagerly in pipe()', () => {
    const sse = new SseStream();
    let writeHeadCalled = false;
    const sink = new Sink(() => {
      writeHeadCalled = true;
    });
    sse.pipe(sink);
    expect(writeHeadCalled).to.equal(false);
    expect(sse.headersCommitted).to.equal(false);
  });

  it('sets headers on first message when destination looks like a HTTP Response', callback => {
    const sse = new SseStream();
    const sink = new Sink(
      (status: number, headers: string | OutgoingHttpHeaders) => {
        expect(headers).to.deep.equal({
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
    sse.writeMessage({ data: 'trigger' }, noop);
  });

  it('sets additional headers when provided', callback => {
    const sse = new SseStream();
    const sink = new Sink(
      (status: number, headers: string | OutgoingHttpHeaders) => {
        expect(headers).to.contain.keys('access-control-headers');
        expect(headers['access-control-headers']).to.equal('some-cors-value');
        callback();
        return sink;
      },
    );

    sse.pipe(sink, {
      additionalHeaders: { 'access-control-headers': 'some-cors-value' },
    });
    sse.writeMessage({ data: 'trigger' }, noop);
  });

  it('sets custom status code when provided', callback => {
    const sse = new SseStream();
    const sink = new Sink(
      (status: number, headers: string | OutgoingHttpHeaders) => {
        expect(status).to.equal(404);
        callback();
        return sink;
      },
    );

    sse.pipe(sink, {
      statusCode: 404,
    });
    sse.writeMessage({ data: 'trigger' }, noop);
  });

  it('defaults to 200 status code when not provided', callback => {
    const sse = new SseStream();
    const sink = new Sink(
      (status: number, headers: string | OutgoingHttpHeaders) => {
        expect(status).to.equal(200);
        callback();
        return sink;
      },
    );

    sse.pipe(sink);
    sse.writeMessage({ data: 'trigger' }, noop);
  });

  it('does not throw when destination is ended before first message', async () => {
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);
    sink.end();
    await written(sink);

    sse.writeMessage({ data: 'ignored' }, noop);
    expect(sse.headersCommitted).to.equal(false);
  });

  it('preserves explicit id of 0 in writeMessage', async () => {
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    sse.writeMessage(
      {
        id: '0',
        data: 'first',
      },
      noop,
    );
    sse.end();
    await written(sink);

    expect(sink.content).to.equal(
      `
id: 0
data: first

`,
    );
  });

  it('serializes id of 0 in _transform', async () => {
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    sse.writeMessage(
      {
        id: '0',
        type: 'ping',
        data: 'hello',
      },
      noop,
    );
    sse.end();
    await written(sink);

    expect(sink.content).to.contain('id: 0\n');
  });

  it('allows an eventsource to connect', callback => {
    let sse: SseStream;
    const server = createServer((req, res) => {
      sse = new SseStream(req);
      sse.pipe(res);
      sse.writeMessage({ data: 'hello' }, noop);
    });

    server.listen(() => {
      const es = new EventSource(
        `http://localhost:${(server.address() as AddressInfo).port}`,
      );
      es.onmessage = e => {
        expect(e.data).to.equal('hello');
        es.close();
        server.close(callback);
      };
      es.onerror = e =>
        callback(new Error(`Error from EventSource: ${JSON.stringify(e)}`));
    });
  });
});
