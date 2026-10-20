import { StreamableFile } from '@nestjs/common';
import { isFunction } from '@nestjs/common/internal';

/**
 * Destroys the stream of a `StreamableFile` that will not be sent. Nothing
 * else would release what the stream reads from (e.g. an open file).
 */
export function destroyStreamableFile(value: unknown) {
  if (!(value instanceof StreamableFile)) {
    return;
  }
  const stream = value.getStream();
  if (isFunction(stream?.destroy)) {
    stream.destroy();
  }
}
