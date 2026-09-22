import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { PassThrough, Readable } from 'stream';

export interface FakePart {
  type: 'file' | 'field';
  fieldname: string;
  filename?: string;
  value?: string;
  content?: string;
  truncated?: boolean;
  fieldnameTruncated?: boolean;
  valueTruncated?: boolean;
  /**
   * The client disconnects while this file is being uploaded: the stream is
   * destroyed (without an error) after `content`, and the parts iterator
   * then fails, as @fastify/multipart does.
   */
  aborted?: boolean;
}

/**
 * The methods @fastify/multipart decorates the request prototype with, which
 * `@UploadedFile()` / `@UploadedFiles()` would read if left unshadowed.
 */
const decoratedRequest = {
  file() {},
  files() {},
};

function createFileStream(part: FakePart) {
  const chunk = Buffer.from(part.content ?? '');
  if (!part.aborted) {
    return Readable.from([chunk]);
  }
  const stream = new Readable({ read() {} });
  stream.push(chunk);
  setImmediate(() => stream.destroy());
  return stream;
}

/**
 * A stand-in for a Fastify request decorated by @fastify/multipart: `parts()`
 * yields the given parts, each file backed by a stream with `content`.
 */
export function createFakeRequest(
  parts: FakePart[],
  { multipart = true, plugin = true } = {},
) {
  const raw = Object.assign(new PassThrough(), {
    unpipe: vi.fn(),
  });
  raw.end();
  const req: any = Object.create(plugin ? decoratedRequest : {});
  req.raw = raw;
  if (plugin) {
    req.isMultipart = () => multipart;
    req.parts = vi.fn(() =>
      (async function* () {
        for (const part of parts) {
          if (part.type === 'field') {
            yield {
              type: 'field',
              fieldname: part.fieldname,
              value: part.value,
              mimetype: 'text/plain',
              encoding: '7bit',
              fieldnameTruncated: !!part.fieldnameTruncated,
              valueTruncated: !!part.valueTruncated,
            };
            continue;
          }
          const file = Object.assign(createFileStream(part), {
            truncated: !!part.truncated,
          });
          // @fastify/multipart always listens for file stream errors.
          file.on('error', () => undefined);
          yield {
            type: 'file',
            fieldname: part.fieldname,
            filename: part.filename,
            encoding: '7bit',
            mimetype: 'text/plain',
            file,
          };
          // As @fastify/multipart does: the next part is produced only once
          // the current file stream has been consumed.
          if (!file.readableEnded && !file.closed) {
            await new Promise(resolve => file.once('close', resolve));
          }
          if (part.aborted) {
            throw Object.assign(new Error('the request was closed'), {
              code: 'FST_MP_PREMATURE_CLOSE',
            });
          }
        }
      })(),
    );
  }
  return req;
}

export function createContext(req: any, reply: any = {}) {
  return new ExecutionContextHost([req, reply]);
}

export const file = (
  fieldname: string,
  content = 'data',
  filename = `${fieldname}.txt`,
): FakePart => ({ type: 'file', fieldname, filename, content });

export const field = (fieldname: string, value: string): FakePart => ({
  type: 'field',
  fieldname,
  value,
});
