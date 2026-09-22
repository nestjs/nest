import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { IncomingMessage } from 'http';
import type { Readable } from 'stream';
import type {
  IncomingMultipartFile,
  MultipartField,
  MultipartFileStream,
  MultipartLimits,
  MultipartOptions,
  MultipartStorageEngine,
  UploadedMultipartFile,
} from '../interfaces/index.js';
import { diskStorage } from '../storage/disk.storage.js';
import { memoryStorage } from '../storage/memory.storage.js';
import { appendField } from './append-field.util.js';
import {
  busboyExceptions,
  MISSING_PLUGIN_MESSAGE,
  multerExceptions,
} from './multipart.constants.js';
import { MultipartError } from './multipart.error.js';
import { transformException } from './multipart.utils.js';

/**
 * Where accepted files end up, named after multer's `FileAppender` strategies.
 */
export type FileStrategy = 'VALUE' | 'ARRAY' | 'OBJECT' | 'NONE';

export interface UploadSpec {
  /** Accepted file fields; `'ANY'` accepts every field without a count limit. */
  fields: MultipartField[] | 'ANY';
  strategy: FileStrategy;
}

type BusboyFileStream = Readable & { truncated?: boolean };

/**
 * The parts of `@fastify/multipart`'s API this package relies on. Declared
 * locally rather than imported, so the emitted typings do not require the
 * (optional) plugin to be installed.
 */
interface MultipartPart {
  type: 'file' | 'field';
  fieldname: string;
  filename?: string;
  encoding: string;
  mimetype: string;
  file?: BusboyFileStream;
  value?: unknown;
  fieldnameTruncated?: boolean;
  valueTruncated?: boolean;
}

type MultipartRequest = FastifyRequest & {
  isMultipart?: () => boolean;
  parts?: (options?: Record<string, unknown>) => AsyncIterable<MultipartPart>;
};

/** Same resolution order as multer: `storage`, then `dest`, then memory. */
export function resolveStorage(
  options: MultipartOptions,
): MultipartStorageEngine {
  if (options.storage) {
    return options.storage;
  }
  if (options.dest) {
    return diskStorage({ destination: options.dest });
  }
  return memoryStorage();
}

function assertPluginRegistered(
  req: MultipartRequest,
): asserts req is Required<MultipartRequest> {
  if (typeof req.isMultipart !== 'function') {
    throw new Error(MISSING_PLUGIN_MESSAGE);
  }
}

/**
 * Per-route options handed to `req.parts()`; `@fastify/multipart` deep-merges
 * them over the options the plugin was registered with. `@fastify/busboy`
 * treats `fileSize` and `parts` as "max allowed" (it fires once a limit is
 * exceeded), so unlike multer there is no `+1` adjustment. Truncation is
 * detected here (`file.truncated`), so the plugin's own throw is disabled.
 */
function toBusboyConfig(
  limits: MultipartLimits | undefined,
  options: MultipartOptions,
) {
  const config: Record<string, unknown> = { throwFileSizeLimit: false };
  if (limits) {
    config.limits = { ...limits };
  }
  if (options.preservePath !== undefined) {
    config.preservePath = options.preservePath;
  }
  if (options.defParamCharset) {
    config.defParamCharset = options.defParamCharset;
  }
  return config;
}

/**
 * `file()` and `files()` are methods `@fastify/multipart` decorates the
 * request prototype with. An own property shadows them for this request only,
 * which is where `@UploadedFile()` / `@UploadedFiles()` read from on Fastify.
 */
function setOnRequest(
  req: FastifyRequest,
  key: 'file' | 'files' | 'body',
  value: unknown,
) {
  (req as any)[key] = value;
}

/**
 * Shadows both methods up front, so that the one this interceptor does not
 * populate reads `undefined`, as on Express, rather than the plugin's method.
 */
function resetFiles(req: FastifyRequest) {
  setOnRequest(req, 'file', undefined);
  setOnRequest(req, 'files', undefined);
}

function toIncomingFile(part: MultipartPart): IncomingMultipartFile {
  const file = {
    fieldname: part.fieldname,
    originalname: decodeFormDataName(part.filename!),
    encoding: part.encoding,
    mimetype: part.mimetype,
  } as IncomingMultipartFile;
  Object.defineProperty(file, 'stream', {
    value: part.file,
    enumerable: false,
    configurable: true,
  });
  return file;
}

function applyFileFilter(
  options: MultipartOptions,
  req: FastifyRequest,
  file: IncomingMultipartFile,
): Promise<boolean> {
  if (!options.fileFilter) {
    return Promise.resolve(true);
  }
  return new Promise((resolve, reject) =>
    options.fileFilter!(req, file, (err, accept) =>
      err ? reject(err) : resolve(accept),
    ),
  );
}

const ABORTED = Symbol('aborted');

/**
 * Runs the storage engine. Resolves `ABORTED` when `@fastify/multipart`
 * destroys the file stream mid-way (it does so, without an error, when the
 * client disconnects or a limit is hit), because a storage engine waiting
 * for `end` would otherwise never call back. The actual reason is then read
 * from the parts iterator. A stream destroyed with an error was destroyed by
 * the engine (e.g. by a `pipeline()` to a file that cannot be written), which
 * reports that error itself.
 *
 * Whatever the engine stores after an abort is removed once it calls back,
 * as multer does: what it stored when it succeeds, and the file at `path`
 * (which engines set before writing, by multer's convention) when it fails.
 */
function storeFile(
  storage: MultipartStorageEngine,
  req: FastifyRequest,
  file: IncomingMultipartFile,
) {
  return new Promise<Partial<UploadedMultipartFile> | typeof ABORTED>(
    (resolve, reject) => {
      const stream = file.stream;
      if (stream.destroyed) {
        return resolve(ABORTED);
      }
      let aborted = false;
      const onClose = () => {
        if (!stream.readableEnded && !stream.errored) {
          aborted = true;
          resolve(ABORTED);
        }
      };
      stream.once('close', onClose);
      storage._handleFile(req, file, (err, info) => {
        stream.off('close', onClose);
        if (!aborted) {
          return err ? reject(err) : resolve(info ?? {});
        }
        const stored = Object.assign(
          file,
          err ? {} : info,
        ) as unknown as UploadedMultipartFile;
        if (!err || stored.path) {
          removeFiles(storage, req, [stored]).catch(() => undefined);
        }
      });
    },
  );
}

function removeFiles(
  storage: MultipartStorageEngine,
  req: FastifyRequest,
  files: UploadedMultipartFile[],
) {
  return Promise.all(
    files.map(
      file =>
        new Promise<void>(resolve =>
          storage._removeFile(req, file, () => resolve()),
        ),
    ),
  );
}

/**
 * Stops parsing and discards the rest of the body, so that an error response
 * does not race a client that is still uploading (multer does the same
 * before it reports an error).
 */
export function drainRequest(raw: IncomingMessage): Promise<void> {
  raw.unpipe();
  if (raw.readableEnded || raw.destroyed) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const done = () => resolve();
    raw.once('end', done);
    raw.once('close', done);
    raw.once('error', done);
    raw.resume();
  });
}

/**
 * Rejects limits that are not a non-negative integer or `Infinity`, as
 * multer does: busboy compares most limits with strict equality, so such a
 * value would silently disable the limit.
 */
export function validateLimits(limits: MultipartLimits | undefined) {
  for (const [key, value] of Object.entries(limits ?? {})) {
    if (
      value == null ||
      (Number.isInteger(value) && value >= 0) ||
      value === Infinity
    ) {
      continue;
    }
    throw new TypeError(
      `Expected limits.${key} to be a non-negative integer or Infinity`,
    );
  }
}

function resolveLimits(req: FastifyRequest, options: MultipartOptions) {
  if (typeof options.limits !== 'function') {
    return options.limits;
  }
  const limits = options.limits(req);
  validateLimits(limits);
  return limits;
}

/**
 * Reverses the escapes browsers apply to form field names (`%0A`, `%0D`,
 * `%22`), as multer does.
 */
function decodeFormDataName(name: string) {
  return name.replace(/%0A|%0D|%22/gi, match => {
    switch (match.toUpperCase()) {
      case '%0A':
        return '\n';
      case '%0D':
        return '\r';
      default:
        return '"';
    }
  });
}

/**
 * Decodes the part's field name, and returns the name as it arrived.
 */
function decodeFieldName(part: MultipartPart): string {
  if (part.fieldname == null) {
    throw new MultipartError('MISSING_FIELD_NAME');
  }
  const rawName = part.fieldname;
  part.fieldname = decodeFormDataName(rawName);
  return rawName;
}

/**
 * busboy does not enforce `fieldNameSize` for multipart bodies, so (like
 * multer) it is checked here, against the name as it arrived.
 */
function checkFieldNameSize(
  rawName: string,
  limits: MultipartLimits | undefined,
) {
  if (
    typeof limits?.fieldNameSize === 'number' &&
    rawName.length > limits.fieldNameSize
  ) {
    throw new MultipartError('LIMIT_FIELD_KEY');
  }
}

/**
 * Adds a text field to `body`, with multer's checks, in multer's order.
 */
function appendTextField(
  body: object,
  part: MultipartPart,
  limits: MultipartLimits | undefined,
) {
  const rawName = decodeFieldName(part);
  if (part.fieldnameTruncated) {
    throw new MultipartError('LIMIT_FIELD_KEY');
  }
  if (part.valueTruncated) {
    throw new MultipartError('LIMIT_FIELD_VALUE', part.fieldname);
  }
  checkFieldNameSize(rawName, limits);
  if (!appendField(body, part.fieldname, part.value)) {
    throw new MultipartError('INVALID_FIELD_NAME', part.fieldname);
  }
}

/**
 * Returns the stream of a file part, with multer's checks, in multer's
 * order, or `undefined` for a part without a file name (an empty file
 * input), which multer ignores.
 */
function readFilePart(
  part: MultipartPart,
  limits: MultipartLimits | undefined,
): BusboyFileStream | undefined {
  const rawName = decodeFieldName(part);
  if (!part.filename) {
    part.file!.resume();
    return undefined;
  }
  checkFieldNameSize(rawName, limits);
  return part.file!;
}

/**
 * Parses the multipart body with multer's semantics and populates
 * `req.body` and `req.file` / `req.files`. Requests that are not multipart
 * are passed through untouched, as multer does.
 */
export async function processMultipart(
  request: FastifyRequest,
  spec: UploadSpec,
  options: MultipartOptions,
  storage: MultipartStorageEngine,
): Promise<void> {
  const req = request as MultipartRequest;
  assertPluginRegistered(req);
  resetFiles(req);
  if (!req.isMultipart()) {
    return;
  }

  const filesLeft = new Map<string, number>();
  if (spec.fields !== 'ANY') {
    for (const field of spec.fields) {
      filesLeft.set(field.name, field.maxCount ?? Infinity);
    }
  }
  const body = Object.create(null);
  setOnRequest(req, 'body', body);
  const stored: UploadedMultipartFile[] = [];

  try {
    const limits = resolveLimits(req, options);
    const iterator = req
      .parts(toBusboyConfig(limits, options))
      [Symbol.asyncIterator]();
    for (
      let result = await iterator.next();
      !result.done;
      result = await iterator.next()
    ) {
      const part = result.value;
      if (part.type === 'field') {
        appendTextField(body, part, limits);
        continue;
      }
      const stream = readFilePart(part, limits);
      if (!stream) {
        continue;
      }
      const left =
        spec.fields === 'ANY' ? Infinity : (filesLeft.get(part.fieldname) ?? 0);
      if (left <= 0) {
        throw new MultipartError('LIMIT_UNEXPECTED_FILE', part.fieldname);
      }
      const incoming = toIncomingFile(part);
      if (!(await applyFileFilter(options, req, incoming))) {
        stream.resume();
        continue;
      }
      filesLeft.set(part.fieldname, left - 1);

      const info = await storeFile(storage, req, incoming);
      if (info === ABORTED) {
        // Rejects with what aborted the stream: a limit, or the client
        // disconnecting.
        await iterator.next();
        throw new BadRequestException(
          busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FILE,
        );
      }
      const file = { ...incoming, ...info } as UploadedMultipartFile;
      stored.push(file);
      // busboy truncates the file instead of failing; multer rejects it.
      if (stream.truncated) {
        throw new MultipartError('LIMIT_FILE_SIZE', part.fieldname);
      }
    }
  } catch (err) {
    await removeFiles(storage, req, stored);
    await drainRequest(req.raw);
    throw transformException(err);
  }

  switch (spec.strategy) {
    case 'VALUE':
      setOnRequest(req, 'file', stored[0]);
      break;
    case 'ARRAY':
      setOnRequest(req, 'files', stored);
      break;
    case 'OBJECT': {
      const grouped: Record<string, UploadedMultipartFile[]> =
        Object.create(null);
      for (const file of stored) {
        (grouped[file.fieldname] ??= []).push(file);
      }
      setOnRequest(req, 'files', grouped);
      break;
    }
  }
}

/**
 * Parses up to and including the first file in `fieldName`, then stops and
 * hands that file's stream to the route handler (`req.file.stream`). Text
 * fields sent before the file are in `req.body`; anything after it is not
 * parsed.
 */
export async function processStream(
  request: FastifyRequest,
  fieldName: string,
  options: MultipartOptions,
): Promise<void> {
  const req = request as MultipartRequest;
  assertPluginRegistered(req);
  resetFiles(req);
  if (!req.isMultipart()) {
    return;
  }

  const body = Object.create(null);
  setOnRequest(req, 'body', body);

  try {
    const limits = resolveLimits(req, options);
    const iterator = req
      .parts(toBusboyConfig(limits, options))
      [Symbol.asyncIterator]();
    for (
      let result = await iterator.next();
      !result.done;
      result = await iterator.next()
    ) {
      const part = result.value;
      if (part.type === 'field') {
        appendTextField(body, part, limits);
        continue;
      }
      const stream = readFilePart(part, limits);
      if (!stream) {
        continue;
      }
      if (part.fieldname !== fieldName) {
        throw new MultipartError('LIMIT_UNEXPECTED_FILE', part.fieldname);
      }
      const incoming = toIncomingFile(part);
      if (!(await applyFileFilter(options, req, incoming))) {
        stream.resume();
        continue;
      }
      // busboy would silently truncate; fail the consumer's read instead.
      // The limit may have been hit already: busboy parses the part as far
      // as the chunk at hand goes before the part reaches this loop.
      const rejectFile = () =>
        stream.destroy(
          new PayloadTooLargeException(multerExceptions.LIMIT_FILE_SIZE),
        );
      if (stream.truncated) {
        rejectFile();
      } else {
        stream.once('limit', rejectFile);
      }
      const file: MultipartFileStream = { ...incoming, stream };
      setOnRequest(req, 'file', file);
      // The iterator is left suspended: the handler now owns the stream.
      return;
    }
  } catch (err) {
    await drainRequest(req.raw);
    throw transformException(err);
  }
}
