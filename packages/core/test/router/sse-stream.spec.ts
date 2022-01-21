import { expect } from 'chai';
import * as EventSource from 'eventsource';
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
    // Arrange
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    // Act
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

    // Assert
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
    // Arrange
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    // Act
    sse.writeMessage(
      {
        data: { hello: 'world' },
      },
      noop,
    );
    sse.end();
    await written(sink);

    // Assert
    expect(sink.content).to.equal(
      `
id: 1
data: {"hello":"world"}

`,
    );
  });

  it('writes all message attributes', async () => {
    // Arrange
    const sse = new SseStream();
    const sink = new Sink();
    sse.pipe(sink);

    // Act
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

    // Assert
    expect(sink.content).to.equal(
      `
event: tea-time
id: the-id
retry: 222
data: hello

`,
    );
  });

  it('sets headers on destination when it looks like a HTTP Response', callback => {
    // Arrange
    const sse = new SseStream();
    const sink = new Sink(
      (status: number, headers: string | OutgoingHttpHeaders) => {
        // Assert
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
  });

  it('sets additional headers when provided', callback => {
    // Arrange
    const sse = new SseStream();
    const sink = new Sink(
      (status: number, headers: string | OutgoingHttpHeaders) => {
        // Assert
        expect(headers).to.contain.keys('access-control-headers');
        expect(headers['access-control-headers']).to.equal('some-cors-value');
        callback();
        return sink;
      },
    );
    sse.pipe(sink, {
      additionalHeaders: { 'access-control-headers': 'some-cors-value' },
    });
  });

  it('allows an eventsource to connect', callback => {
    // Arrange
    let sse: SseStream;
    const server = createServer((req, res) => {
      sse = new SseStream(req);
      sse.pipe(res);
    });

    // Act
    server.listen(() => {
      const es = new EventSource(
        `http://localhost:${(server.address() as AddressInfo).port}`,
      );
      es.onmessage = e => {
        // Assert
        expect(e.data).to.equal('hello');
        es.close();
        server.close(callback);
      };
      es.onopen = () => sse.writeMessage({ data: 'hello' }, noop);
      es.onerror = e =>
        callback(new Error(`Error from EventSource: ${JSON.stringify(e)}`));
    });
  });
});
