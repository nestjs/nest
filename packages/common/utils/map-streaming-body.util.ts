import { Readable } from 'stream';
import { types } from 'util';
import { isFunction, isString } from './shared.utils.js';

type BodyIterator = Required<AsyncIterator<unknown>>;

/**
 * A streaming body that yields what `body` does, with `project` applied to
 * each value the router sends as a line of JSON: that is any but strings and
 * binary data, which it sends as they are.
 *
 * Nothing is read from `body` before the result is, which it may never be:
 * the router stops a body it does not send (e.g. for a HEAD request) unread.
 */
export function mapStreamingBody(
  body: any,
  project: (value: unknown) => unknown,
): any {
  // Neither a web `Response` nor a `Readable` that is not in object mode yields
  // anything but text and binary data, and a body that has been read already is
  // left for the router to refuse.
  if (
    !isFunction(body[Symbol.asyncIterator]) ||
    body.readableObjectMode === false ||
    body.locked === true ||
    Readable.isDisturbed(body)
  ) {
    return body;
  }
  let iterator: BodyIterator | undefined;
  const open = () => (iterator ??= openStreamingBody(body));
  const mapResult = async (result: IteratorResult<unknown>) => {
    if (result.done || isString(result.value) || isBinary(result.value)) {
      return result;
    }
    try {
      return { done: false, value: await project(result.value) };
    } catch (err) {
      // As an async generator would: `for await` does not stop an iterator
      // that failed, so nothing else may stop the body.
      void open()
        .return(undefined)
        .catch(() => undefined);
      throw err;
    }
  };

  // Like an async generator, the result is its own iterator: not every consumer
  // (e.g. a GraphQL subscription) asks for `Symbol.asyncIterator`.
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next: async () => mapResult(await open().next()),
    return: async (value?: unknown) => mapResult(await open().return(value)),
    throw: async (error?: unknown) => mapResult(await open().throw(error)),
  };
}

function isBinary(value: unknown): boolean {
  return ArrayBuffer.isView(value) || types.isAnyArrayBuffer(value);
}

/**
 * Opens the body for reading, as the router does: neither the async iterator
 * of a `ReadableStream` nor that of a `Readable` stops the stream until the
 * read in progress settles, which an upstream that went quiet may never do, so
 * these are stopped directly. An async generator over `body` would wait too.
 */
function openStreamingBody(body: any): BodyIterator {
  if (isFunction(body.getReader)) {
    const reader = body.getReader();
    return {
      next: () => reader.read(),
      return: async value => {
        await reader.cancel();
        return { done: true, value };
      },
      throw: async error => {
        await reader.cancel(error);
        throw error;
      },
    };
  }
  const iterator: AsyncIterator<unknown> = body[Symbol.asyncIterator]();
  return {
    next: () => iterator.next(),
    return: async value => {
      body.destroy?.();
      return (await iterator.return?.(value)) ?? { done: true, value };
    },
    throw: async error => {
      if (!isFunction(iterator.throw)) {
        throw error;
      }
      return iterator.throw(error);
    },
  };
}
