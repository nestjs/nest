import { Readable } from 'stream';
import { types } from 'util';
import { isFunction } from '../utils/shared.utils';
import { StreamableFileOptions } from './streamable-options.interface';

export class StreamableFile {
  private readonly stream: Readable;

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
      acceptRanges = undefined,
      length = undefined,
      range = undefined,
    } = this.options;
    return {
      type,
      disposition,
      acceptRanges,
      length,
      range,
    };
  }
}
