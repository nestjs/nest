import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { BunRequest } from '../../adapters/bun-request.js';
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
import { BODY_CONSUMED_MESSAGE } from './multipart.constants.js';
import { MultipartError } from './multipart.error.js';
import { transformException, transformParseError } from './multipart.utils.js';

/**
 * Where accepted files end up, named after multer's `FileAppender` strategies.
 */
export type FileStrategy = 'VALUE' | 'ARRAY' | 'OBJECT' | 'NONE';

export interface UploadSpec {
  /** Accepted file fields; `'ANY'` accepts every field without a count limit. */
  fields: MultipartField[] | 'ANY';
  strategy: FileStrategy;
}

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

/**
 * Rejects limits that are not a non-negative integer or `Infinity`, as
 * multer does.
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

function resolveLimits(req: BunRequest, options: MultipartOptions) {
  if (typeof options.limits !== 'function') {
    return options.limits ?? {};
  }
  const limits = options.limits(req);
  validateLimits(limits);
  return limits ?? {};
}

function isMultipart(req: BunRequest) {
  return /^multipart\/form-data\b/i.test(req.headers['content-type'] ?? '');
}

/**
 * Parses the body with Bun's native multipart parser. Requests that are not
 * multipart resolve `null`, and are passed through untouched, as multer does.
 */
async function readForm(req: BunRequest): Promise<FormData | null> {
  if (!isMultipart(req)) {
    return null;
  }
  if (req.bodyUsed) {
    throw new Error(BODY_CONSUMED_MESSAGE);
  }
  try {
    return await req.native.formData();
  } catch (err) {
    throw transformParseError(err);
  }
}

/**
 * Sets `req.file` and `req.files` up front, so that the one an interceptor
 * does not populate reads `undefined`, as on Express.
 */
function resetFiles(req: BunRequest) {
  req.file = undefined;
  req.files = undefined;
}

/**
 * Reverses the escapes browsers apply to form field and file names (`%0A`,
 * `%0D`, `%22`), as multer does.
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

function toIncomingFile(
  fieldname: string,
  file: File,
  options: MultipartOptions,
): IncomingMultipartFile {
  const name = decodeFormDataName(file.name);
  const incoming = {
    fieldname,
    // busboy keeps only the base name unless `preservePath` is set.
    originalname: options.preservePath
      ? name
      : name.slice(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1),
    encoding: '7bit',
    mimetype: file.type || 'application/octet-stream',
  } as IncomingMultipartFile;
  let stream: Readable | undefined;
  Object.defineProperties(incoming, {
    blob: { value: file, enumerable: false, configurable: true },
    stream: {
      get: () =>
        (stream ??= Readable.fromWeb(
          file.stream() as unknown as NodeReadableStream,
        )),
      enumerable: false,
      configurable: true,
    },
  });
  return incoming;
}

function applyFileFilter(
  options: MultipartOptions,
  req: BunRequest,
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

function storeFile(
  storage: MultipartStorageEngine,
  req: BunRequest,
  file: IncomingMultipartFile,
) {
  return new Promise<Partial<UploadedMultipartFile>>((resolve, reject) =>
    storage._handleFile(req, file, (err, info) =>
      err ? reject(err) : resolve(info ?? {}),
    ),
  );
}

function removeFiles(
  storage: MultipartStorageEngine,
  req: BunRequest,
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
 * Validates the shape of a part's field name with multer's checks, and
 * returns it decoded.
 */
function checkFieldName(rawName: string, limits: MultipartLimits) {
  if (!rawName) {
    throw new MultipartError('MISSING_FIELD_NAME');
  }
  if (
    typeof limits.fieldNameSize === 'number' &&
    Buffer.byteLength(rawName) > limits.fieldNameSize
  ) {
    throw new MultipartError('LIMIT_FIELD_KEY');
  }
  const name = decodeFormDataName(rawName);
  if (
    typeof limits.fieldNestingDepth === 'number' &&
    name.split('[').length - 1 > limits.fieldNestingDepth
  ) {
    throw new MultipartError('LIMIT_FIELD_NESTING', name);
  }
  if (
    typeof limits.fieldArrayIndexLimit === 'number' &&
    exceedsArrayIndexLimit(name, limits.fieldArrayIndexLimit)
  ) {
    throw new MultipartError('LIMIT_FIELD_ARRAY_INDEX', name);
  }
  return name;
}

/**
 * Walks the parsed parts in order, enforcing the part, field and file count
 * limits, and adds text fields to `body`. Calls `onFile` for every file part
 * with a file name (an empty file input is ignored, as in multer); stops
 * early when `onFile` returns `false`.
 */
async function walkParts(
  form: FormData,
  body: object,
  limits: MultipartLimits,
  onFile: (name: string, file: File) => Promise<boolean | void>,
) {
  let parts = 0;
  let fields = 0;
  let files = 0;
  for (const [rawName, value] of form) {
    if (++parts > (limits.parts ?? Infinity)) {
      throw new MultipartError('LIMIT_PART_COUNT');
    }
    if (typeof value === 'string') {
      if (++fields > (limits.fields ?? Infinity)) {
        throw new MultipartError('LIMIT_FIELD_COUNT');
      }
      const name = checkFieldName(rawName, limits);
      if (
        typeof limits.fieldSize === 'number' &&
        Buffer.byteLength(value) > limits.fieldSize
      ) {
        throw new MultipartError('LIMIT_FIELD_VALUE', name);
      }
      if (!appendField(body, name, value)) {
        throw new MultipartError('INVALID_FIELD_NAME', name);
      }
      continue;
    }
    if (++files > (limits.files ?? Infinity)) {
      throw new MultipartError('LIMIT_FILE_COUNT');
    }
    const name = checkFieldName(rawName, limits);
    if (!value.name) {
      continue;
    }
    if ((await onFile(name, value)) === false) {
      return;
    }
  }
}

function checkFileSize(name: string, file: File, limits: MultipartLimits) {
  if (file.size > (limits.fileSize ?? Infinity)) {
    throw new MultipartError('LIMIT_FILE_SIZE', name);
  }
}

/**
 * Parses the multipart body with multer's semantics and populates
 * `req.body` and `req.file` / `req.files`.
 */
export async function processMultipart(
  req: BunRequest,
  spec: UploadSpec,
  options: MultipartOptions,
  storage: MultipartStorageEngine,
): Promise<void> {
  resetFiles(req);
  const form = await readForm(req);
  if (!form) {
    return;
  }

  const filesLeft = new Map<string, number>();
  if (spec.fields !== 'ANY') {
    for (const field of spec.fields) {
      filesLeft.set(field.name, field.maxCount ?? Infinity);
    }
  }
  const body = Object.create(null);
  req.body = body;
  const stored: UploadedMultipartFile[] = [];

  try {
    const limits = resolveLimits(req, options);
    await walkParts(form, body, limits, async (name, file) => {
      const left =
        spec.fields === 'ANY' ? Infinity : (filesLeft.get(name) ?? 0);
      if (left <= 0) {
        throw new MultipartError('LIMIT_UNEXPECTED_FILE', name);
      }
      const incoming = toIncomingFile(name, file, options);
      if (!(await applyFileFilter(options, req, incoming))) {
        return;
      }
      filesLeft.set(name, left - 1);
      // The size is known up front, so an oversized file is never stored.
      checkFileSize(name, file, limits);
      const info = await storeFile(storage, req, incoming);
      stored.push(
        Object.assign(incoming, info) as unknown as UploadedMultipartFile,
      );
    });
  } catch (err) {
    await removeFiles(storage, req, stored);
    throw transformException(err);
  }

  switch (spec.strategy) {
    case 'VALUE':
      req.file = stored[0];
      break;
    case 'ARRAY':
      req.files = stored;
      break;
    case 'OBJECT': {
      const grouped: Record<string, UploadedMultipartFile[]> =
        Object.create(null);
      for (const file of stored) {
        (grouped[file.fieldname] ??= []).push(file);
      }
      req.files = grouped;
      break;
    }
  }
}

/**
 * Parses the body and hands the first file in `fieldName` to the route
 * handler as a stream (`req.file.stream`). Text fields sent before the file
 * are in `req.body`; parts after it are ignored.
 */
export async function processStream(
  req: BunRequest,
  fieldName: string,
  options: MultipartOptions,
): Promise<void> {
  resetFiles(req);
  const form = await readForm(req);
  if (!form) {
    return;
  }
  const body = Object.create(null);
  req.body = body;

  try {
    const limits = resolveLimits(req, options);
    await walkParts(form, body, limits, async (name, file) => {
      if (name !== fieldName) {
        throw new MultipartError('LIMIT_UNEXPECTED_FILE', name);
      }
      const incoming = toIncomingFile(name, file, options);
      if (!(await applyFileFilter(options, req, incoming))) {
        return;
      }
      checkFileSize(name, file, limits);
      const result: MultipartFileStream = {
        fieldname: incoming.fieldname,
        originalname: incoming.originalname,
        encoding: incoming.encoding,
        mimetype: incoming.mimetype,
        stream: incoming.stream,
      };
      req.file = result;
      return false;
    });
  } catch (err) {
    throw transformException(err);
  }
}
