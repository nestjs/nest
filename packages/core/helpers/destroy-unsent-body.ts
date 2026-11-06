import { StreamableFile } from '@nestjs/common';
import { isFunction } from '@nestjs/common/internal';
import {
  cancelStreamingBody,
  isStreamingBody,
} from '../router/streaming-body.js';

/**
 * Releases a response body that will not be sent. Nothing else would release
 * what its stream reads from (e.g. an open file), or stop what produces it.
 */
export function destroyUnsentBody(value: unknown) {
  if (isStreamingBody(value)) {
    void cancelStreamingBody(value);
    return;
  }
  if (!(value instanceof StreamableFile)) {
    return;
  }
  const stream = value.getStream();
  if (isFunction(stream?.destroy)) {
    stream.destroy();
  }
}
