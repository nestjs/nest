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
import { appendField, closeArrayGaps } from './append-field.util.js';
import {
  busboyExceptions,
  DEFAULT_FIELD_NAME_LIMITS,
  DEFAULT_JSON_FIELDS_SIZE,
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
 * them over the options the plugin was registered with. Limits set to `null`
 * or `undefined` are left out, as the merge would copy them over the
 * plugin's limits (and its `fileSize` and `parts` defaults), which
 * `@fastify/busboy` then reads as no limit. `@fastify/busboy` treats
 * `fileSize` and `parts` as "max allowed" (it fires once a limit is
 * exceeded), so unlike multer there is no `+1` adjustment. Truncation is
 * detected here (`file.truncated`), so the plugin's own throw is disabled.
 */
function toBusboyConfig(
  limits: MultipartLimits | undefined,
  options: MultipartOptions,
) {
  const config: Record<string, unknown> = { throwFileSizeLimit: false };
  if (limits) {
    config.limits = Object.fromEntries(
      Object.entries(limits).filter(([, value]) => value != null),
    );
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

/**
 * Whether `value` is a promise (e.g. the result of an async callback-style
 * function), whose rejection would go unhandled if it were ignored.
 */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
}

function applyFileFilter(
  options: MultipartOptions,
  req: FastifyRequest,
  file: IncomingMultipartFile,
): Promise<boolean> {
  if (!options.fileFilter) {
    return Promise.resolve(true);
  }
  return new Promise((resolve, reject) => {
    const result: unknown = options.fileFilter!(req, file, (err, accept) =>
      err ? reject(err) : resolve(accept),
    );
    // The rejection of an async filter fails the request, as a throw does,
    // rather than going unhandled.
    if (isThenable(result)) {
      result.then(undefined, reject);
    }
  });
}

const ABORTED = Symbol('aborted');

/**
 * Runs the storage engine, but does not wait for it once `@fastify/multipart`
 * destroys the file stream mid-way (when the client disconnects, the body is
 * malformed or a limit is hit), because a storage engine waiting for `end`
 * (or one that only `pipe()`s the stream) would otherwise never call back.
 * Before 10.1.7, `@fastify/multipart` destroyed the stream without an
 * error: this resolves `ABORTED` then, and the actual reason is read from
 * the parts iterator. Since 10.1.7, it destroys the stream with an error,
 * and the parts iterator fails once it has handed over the parts the parser
 * had queued by then (e.g. a text field after the file). `readAhead` reads
 * those parts ahead, one at a time (the parse loop then takes them over),
 * and this rejects with the iterator's error once it is found. A stream
 * destroyed by the engine (e.g. by a `pipeline()` to a file that cannot be
 * written) is reported by the engine itself: the iterator then ends, or
 * waits, instead of failing.
 *
 * Whatever the engine stores after an abort is removed, as multer does. The
 * file at `path` (which engines set before writing, by multer's convention)
 * is removed right away, as an engine waiting on `pipeline()` never calls
 * back for a stream destroyed after its last chunk; removing it clears
 * `path`. What the engine stored is removed once it calls back: what it
 * returned when it succeeds, and the file at `path` when it fails, also
 * without an abort, as multer's convention leaves that to the caller.
 */
function storeFile(
  storage: MultipartStorageEngine,
  req: FastifyRequest,
  file: IncomingMultipartFile,
  readAhead: () => Promise<IteratorResult<unknown>>,
) {
  return new Promise<Partial<UploadedMultipartFile> | typeof ABORTED>(
    (resolve, reject) => {
      const stream = file.stream;
      if (stream.destroyed) {
        return resolve(ABORTED);
      }
      let aborted = false;
      let calledBack = false;
      const abort = (reason?: unknown) => {
        if (calledBack || aborted) {
          return;
        }
        aborted = true;
        if (reason) {
          reject(reason);
        } else {
          resolve(ABORTED);
        }
        const partial = file as unknown as UploadedMultipartFile;
        if (partial.path) {
          removeFiles(storage, req, [partial]).catch(() => undefined);
        }
      };
      const onClose = () => {
        if (stream.readableEnded) {
          return;
        }
        if (!stream.errored) {
          return abort();
        }
        // Up to the parser's error, past the parts queued before it; the
        // iterator ends or waits when the engine destroyed the stream.
        const findReason = (): Promise<unknown> =>
          readAhead().then(
            result => !result.done && !calledBack && !aborted && findReason(),
            err => abort(err),
          );
        void findReason();
      };
      stream.once('close', onClose);
      storage._handleFile(req, file, (err, info) => {
        calledBack = true;
        stream.off('close', onClose);
        if (!aborted && !err) {
          return resolve(info ?? {});
        }
        const stored = Object.assign(
          file,
          err ? {} : info,
        ) as unknown as UploadedMultipartFile;
        if (!err || stored.path) {
          removeFiles(storage, req, [stored]).catch(() => undefined);
        }
        if (!aborted) {
          reject(err);
        }
      });
    },
  );
}

/**
 * Wraps the parts iterator so that `storeFile()` can read parts ahead and the
 * parse loop then takes those parts over, in order: an async iterator queues
 * the calls to `next()`, so calling it again would skip the parts read ahead.
 */
function readingAhead<T>(iterator: AsyncIterator<T>) {
  const partsReadAhead: Promise<IteratorResult<T>>[] = [];
  return {
    nextPart() {
      return partsReadAhead.shift() ?? iterator.next();
    },
    readAhead() {
      const part = iterator.next();
      // Rejects once the parse loop has failed for another reason
      part.catch(() => undefined);
      partsReadAhead.push(part);
      return part;
    },
  };
}

/**
 * Rejects once the connection is closed. `@fastify/multipart` only fails the
 * parts iterator when a request that was not read to its end is closed, and
 * `@fastify/busboy` never finishes a form holding a part whose headers are
 * not followed by an empty line: the parse loop would then wait after the
 * client is gone, and the files stored so far would never be removed. The
 * connection's `close` is watched, as the request's own is emitted once its
 * body has been read. Returns the promise, which is only awaited while the
 * parse loop waits for a part, and a function that stops watching.
 */
function rejectWhenDisconnected(raw: IncomingMessage) {
  const socket = raw?.socket;
  if (typeof socket?.once !== 'function') {
    return { disconnected: new Promise<never>(() => undefined), stop() {} };
  }
  let onClose!: () => void;
  const disconnected = new Promise<never>((_resolve, reject) => {
    onClose = () =>
      reject(
        new BadRequestException(
          busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
        ),
      );
    socket.once('close', onClose);
  });
  disconnected.catch(() => undefined);
  return { disconnected, stop: () => socket.off('close', onClose) };
}

export function removeFiles(
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
 * Whether the field name holds a numeric index above `limit`, decided as
 * multer does. Only a name `appendField` parses as a bracket path builds an
 * array; one it keeps as a literal key (`a[6]suffix`, `[6]`) never does.
 */
function exceedsArrayIndexLimit(name: string, limit: number) {
  if (!/^[^[]+(?:\[[^\]]+\])*(?:\[\])?$/.test(name)) {
    return false;
  }
  for (const [, index] of name.matchAll(/\[(\d+)\]/g)) {
    if (Number(index) > limit) {
      return true;
    }
  }
  return false;
}

/**
 * `fieldNestingDepth` and `fieldArrayIndexLimit` are multer's own limits
 * (busboy knows neither), so they are checked here, against the decoded name.
 * Unlike multer, they default to `DEFAULT_FIELD_NAME_LIMITS`.
 */
function checkFieldNameShape(
  name: string,
  limits: MultipartLimits | undefined,
) {
  const nestingDepth =
    limits?.fieldNestingDepth ?? DEFAULT_FIELD_NAME_LIMITS.fieldNestingDepth;
  if (name.split('[').length - 1 > nestingDepth) {
    throw new MultipartError('LIMIT_FIELD_NESTING', name);
  }
  const arrayIndexLimit =
    limits?.fieldArrayIndexLimit ??
    DEFAULT_FIELD_NAME_LIMITS.fieldArrayIndexLimit;
  if (
    arrayIndexLimit !== Infinity &&
    exceedsArrayIndexLimit(name, arrayIndexLimit)
  ) {
    throw new MultipartError('LIMIT_FIELD_ARRAY_INDEX', name);
  }
}

/**
 * What is left of `limits.jsonFieldsSize` for the rest of a request.
 */
interface FieldBudget {
  jsonFieldsSize: number;
}

function createFieldBudget(limits: MultipartLimits | undefined): FieldBudget {
  return {
    jsonFieldsSize: limits?.jsonFieldsSize ?? DEFAULT_JSON_FIELDS_SIZE,
  };
}

/**
 * `@fastify/multipart` replaces the value of a text field sent as
 * `application/json` with what `JSON.parse()` makes of it (and reports that
 * very mimetype). Such a value takes many times the memory of the text
 * `fieldSize` bounds, for as long as the request lasts, so the total size of
 * these fields in one request is bounded by `limits.jsonFieldsSize`. The
 * plugin does not expose the text it parsed, so the size is that of the
 * value serialized again.
 */
function checkJsonFieldSize(part: MultipartPart, budget: FieldBudget) {
  if (part.mimetype !== 'application/json') {
    return;
  }
  let size: number;
  try {
    size = Buffer.byteLength(JSON.stringify(part.value) ?? '');
  } catch {
    // Nested deeper than the call stack allows to serialize
    throw new MultipartError('LIMIT_JSON_FIELDS_SIZE', part.fieldname);
  }
  budget.jsonFieldsSize -= size;
  if (budget.jsonFieldsSize < 0) {
    throw new MultipartError('LIMIT_JSON_FIELDS_SIZE', part.fieldname);
  }
}

/**
 * Adds a text field to `body`, with multer's checks, in multer's order.
 */
function appendTextField(
  body: object,
  part: MultipartPart,
  limits: MultipartLimits | undefined,
  budget: FieldBudget,
) {
  const rawName = decodeFieldName(part);
  if (part.fieldnameTruncated) {
    throw new MultipartError('LIMIT_FIELD_KEY');
  }
  if (part.valueTruncated) {
    throw new MultipartError('LIMIT_FIELD_VALUE', part.fieldname);
  }
  checkFieldNameSize(rawName, limits);
  checkFieldNameShape(part.fieldname, limits);
  checkJsonFieldSize(part, budget);
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
 * `req.body` and `req.file` / `req.files`, and returns the stored files.
 * Unlike multer, the gaps that array indexes in field names leave in the
 * arrays of `req.body` are closed (see `closeArrayGaps()`).
 * Requests that are not multipart are passed through untouched, as multer
 * does.
 */
export async function processMultipart(
  request: FastifyRequest,
  spec: UploadSpec,
  options: MultipartOptions,
  storage: MultipartStorageEngine,
): Promise<UploadedMultipartFile[]> {
  const req = request as MultipartRequest;
  assertPluginRegistered(req);
  resetFiles(req);
  if (!req.isMultipart()) {
    return [];
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
  const disconnection = rejectWhenDisconnected(req.raw);

  try {
    const limits = resolveLimits(req, options);
    const budget = createFieldBudget(limits);
    const iterator = req
      .parts(toBusboyConfig(limits, options))
      [Symbol.asyncIterator]();
    const { nextPart: readPart, readAhead } = readingAhead(iterator);
    const nextPart = () =>
      Promise.race([readPart(), disconnection.disconnected]);
    for (
      let result = await nextPart();
      !result.done;
      result = await nextPart()
    ) {
      const part = result.value;
      if (part.type === 'field') {
        appendTextField(body, part, limits, budget);
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

      const info = await storeFile(storage, req, incoming, readAhead);
      if (info === ABORTED) {
        // Rejects with what aborted the stream: a limit, a malformed body or
        // the client disconnecting.
        await nextPart();
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
    closeArrayGaps(body);
  } catch (err) {
    await removeFiles(storage, req, stored);
    await drainRequest(req.raw);
    throw transformException(err);
  } finally {
    disconnection.stop();
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
  return stored;
}

/**
 * Parses up to and including the first file in `fieldName`, then stops and
 * hands that file's stream to the route handler (`req.file.stream`). Text
 * fields sent before the file are in `req.body`; anything after it is not
 * parsed. As in `processMultipart()`, the gaps in the arrays of `req.body`
 * are closed. Returns that stream, or `undefined` when there is no such file.
 */
export async function processStream(
  request: FastifyRequest,
  fieldName: string,
  options: MultipartOptions,
): Promise<Readable | undefined> {
  const req = request as MultipartRequest;
  assertPluginRegistered(req);
  resetFiles(req);
  if (!req.isMultipart()) {
    return undefined;
  }

  const body = Object.create(null);
  setOnRequest(req, 'body', body);

  try {
    const limits = resolveLimits(req, options);
    const budget = createFieldBudget(limits);
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
        appendTextField(body, part, limits, budget);
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
      // Nothing reads the parts after this file, but `@fastify/multipart`
      // would go on parsing (text fields as JSON, too) and keeping them until
      // the request is over: the request is detached from the parser once
      // the file ends, and the rest of the body is discarded later on.
      stream.once('end', () => req.raw.unpipe());
      const file: MultipartFileStream = { ...incoming, stream };
      setOnRequest(req, 'file', file);
      closeArrayGaps(body);
      // The iterator is left suspended: the handler now owns the stream.
      return stream;
    }
    closeArrayGaps(body);
  } catch (err) {
    await drainRequest(req.raw);
    throw transformException(err);
  }
  return undefined;
}
