import { Readable } from 'stream';
import { types } from 'util';
import { isFunction } from '../utils/shared.utils';
import { StreamableFileOptions } from './streamable-options.interface';

export interface StreamableHandlerResponse {
  /** `true` if the connection is destroyed, `false` otherwise. */
  destroyed: boolean;
  /** `true` if headers were sent, `false` otherwise. */
  headersSent: boolean;
  /** The status code that will be sent to the client when the headers get flushed. */
  statusCode: number;
  /** Sends the HTTP response. */
  send: (body: string) => void;
  /** Signals to the server that all of the response headers and body have been sent. */
  end: () => void;
}

export class StreamableFile {
  private readonly stream: Readable;

  protected handleError: (
    err: Error,
    response: StreamableHandlerResponse,
  ) => void = (err: Error, res) => {
    if (res.destroyed) {
      return;
    }
    if (res.headersSent) {
      res.end();
      return;
    }

    res.statusCode = 400;
    res.send(err.message);
  };

  constructor(buffer: Uint8Array, options?: StreamableFileOptions);
  constructor(readable: Readable, options?: StreamableFileOptions);
  constructor(
    bufferOrReadStream: Uint8Array | Readable,
    readonly options: StreamableFileOptions = {},
  ) {
    if (types.isUint8Array(bufferOrReadStream)) {
      this.stream = new Readable();
      this.stream.push(bufferOrReadStream);
      this.stream.push(null);
      this.options.length ??= bufferOrReadStream.length;
    } else if (bufferOrReadStream.pipe && isFunction(bufferOrReadStream.pipe)) {
      this.stream = bufferOrReadStream;
    }
  }

  getStream(): Readable {
    return this.stream;
  }

  getHeaders() {
    const {
      type = 'application/octet-stream',
      disposition = undefined,
      length = undefined,
    } = this.options;
    return {
      type,
      disposition,
      length,
    };
  }

  get errorHandler(): (
    err: Error,
    response: StreamableHandlerResponse,
  ) => void {
    return this.handleError;
  }

  setErrorHandler(
    handler: (err: Error, response: StreamableHandlerResponse) => void,
  ) {
    this.handleError = handler;
    return this;
  }
}
