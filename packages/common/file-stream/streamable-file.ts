import { Readable } from 'stream';
import { isFunction } from '../utils/shared.utils';
import { StreamableFileOptions } from './streamable-options.interface';

export class StreamableFile {
  private readonly stream: Readable;

  constructor(buffer: Buffer, options?: StreamableFileOptions);
  constructor(readable: Readable, options?: StreamableFileOptions);
  constructor(
    bufferOrReadStream: Buffer | Readable,
    readonly options: StreamableFileOptions = {},
  ) {
    if (Buffer.isBuffer(bufferOrReadStream)) {
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
    const { type = 'application/octet-stream', disposition = null } =
      this.options;
    return { type, disposition };
  }
}
