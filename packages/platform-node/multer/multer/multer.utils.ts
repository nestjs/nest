import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { isFunction, isNil, isPlainObject } from '@nestjs/common/internal';
import * as coreInternal from '@nestjs/core/internal';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import secureJson from 'secure-json-parse';
import { finished } from 'stream';
import {
  DEFAULT_FIELD_NAME_LIMITS,
  DEFAULT_PARTS_LIMIT,
  multerExceptions,
  busboyExceptions,
} from './multer.constants.js';
import { MulterModuleOptions } from '../interfaces/index.js';
import {
  MulterLimits,
  MulterOptions,
} from '../interfaces/multer-options.interface.js';

/**
 * Set on a request whose pipes rejected it, by the router of
 * `@nestjs/core` (see `markRejectedByPipes()` there). Read through the
 * registered symbol rather than an import, so this package still loads with
 * a version of `@nestjs/core` that does not set it.
 */
const REJECTED_BY_PIPES = Symbol.for('nestjs:rejected-by-pipes');

function isRejectedByPipes(req: any): boolean {
  if (req?.[REJECTED_BY_PIPES] === true) {
    return true;
  }
  // `@nestjs/core` 12.2.0 keeps the record to itself, so ask its helper too.
  // Read off the namespace, since a named import fails with an older core.
  const core = coreInternal as {
    isRejectedByPipes?: (req: unknown) => boolean;
  };
  return core.isRejectedByPipes?.(req) === true;
}

/**
 * Merges module-level (global) multer options with interceptor-level (local)
 * options. `limits` is merged key-by-key rather than replaced outright, so
 * that a route overriding e.g. `limits.fileSize` doesn't silently drop other
 * global limits (such as `limits.files`) it never intended to touch.
 *
 * `limits` may also be a function of the request (multer >= 2.4.0), which
 * can't be merged key-by-key. In that case (or when only one side defines
 * `limits`) the local value wins outright, matching the pre-merge behaviour.
 *
 * A local option or limit set to `null` or `undefined` (e.g. an optional
 * configuration value that is not set) keeps the global value, as if it were
 * not set: to lift a global limit, a route sets it to `Infinity`.
 */
export function mergeMulterOptions(
  options: MulterModuleOptions = {},
  localOptions: MulterOptions = {},
): MulterModuleOptions {
  const merged: MulterModuleOptions = {
    ...options,
    ...withoutNil(localOptions),
  };
  if (isPlainObject(options.limits) && isPlainObject(localOptions.limits)) {
    merged.limits = { ...options.limits, ...withoutNil(localOptions.limits) };
  }
  // `dest` and `storage` both say where files go, and multer prefers
  // `storage`, so a global storage engine would shadow a local `dest`.
  if (localOptions.dest && !localOptions.storage) {
    delete merged.storage;
  }
  return merged;
}

function withoutNil<T extends object>(options: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => !isNil(value)),
  ) as Partial<T>;
}

/**
 * Sets the field name limits multer leaves at `Infinity` to
 * `DEFAULT_FIELD_NAME_LIMITS`, and `parts` to `DEFAULT_PARTS_LIMIT`,
 * wherever they are not set. multer only checks a limit that is present in
 * `limits`, so the defaults are added to the object, or to the object a
 * function-valued `limits` returns.
 *
 * `fileFilter` is wrapped as well (see `passErrorToCallback()`).
 */
export function applyDefaultLimits<T extends MulterOptions>(options: T): T {
  const { limits, fileFilter } = options;
  return {
    ...options,
    ...(isFunction(fileFilter) && {
      fileFilter: passErrorToCallback(fileFilter),
    }),
    limits:
      typeof limits === 'function'
        ? (req: any) => withDefaultLimits(limits(req))
        : withDefaultLimits(limits),
  };
}

type FileFilter = NonNullable<MulterOptions['fileFilter']>;

/**
 * multer calls `fileFilter` from an event of the multipart parser, where
 * nothing catches what it throws: the error would not fail the request but
 * end the process, as would the rejection of an async filter. Either is
 * handed to the filter's callback instead, so that multer fails the request
 * with it, as with `callback(error)`. Once the filter has called back, an
 * error is no longer its decision on the file (multer runs the storage
 * engine from that callback), and is left as it is.
 */
function passErrorToCallback(fileFilter: FileFilter): FileFilter {
  return (req, file, callback) => {
    let calledBack = false;
    const callbackOnce: typeof callback = (error, acceptFile) => {
      if (!calledBack) {
        calledBack = true;
        callback(error, acceptFile);
      }
    };
    const fail = (error: unknown) => {
      if (calledBack) {
        throw error;
      }
      // multer takes a falsy error for none.
      callbackOnce(
        (error || new Error(`fileFilter failed: ${String(error)}`)) as Error,
        false,
      );
    };
    let result: unknown;
    try {
      result = fileFilter(req, file, callbackOnce);
    } catch (error) {
      return fail(error);
    }
    if (isFunction((result as PromiseLike<unknown> | undefined)?.then)) {
      (result as PromiseLike<unknown>).then(undefined, fail);
    }
  };
}

function withDefaultLimits(
  limits: MulterLimits | null | undefined,
): MulterLimits {
  return {
    ...limits,
    fieldNestingDepth:
      limits?.fieldNestingDepth ?? DEFAULT_FIELD_NAME_LIMITS.fieldNestingDepth,
    fieldArrayIndexLimit:
      limits?.fieldArrayIndexLimit ??
      DEFAULT_FIELD_NAME_LIMITS.fieldArrayIndexLimit,
    parts: limits?.parts ?? DEFAULT_PARTS_LIMIT,
  };
}

type MulterMiddleware = (req: any, res: any, next: (err?: any) => void) => void;

/**
 * Runs a multer middleware (e.g. `multer.single()`) over the request, and
 * settles once multer has parsed the body, with multer's error mapped by
 * `transformException()`.
 *
 * The request is destroyed if the response is sent while multer is still
 * receiving the body, e.g. by an interceptor bound earlier that timed out:
 * the route handler would then never run, and nothing would remove what
 * multer goes on to store. multer stops for a destroyed request, and removes
 * the files it stored for it.
 *
 * Once multer is done, the gaps in the arrays of its body are closed (see
 * `closeArrayGaps()`).
 */
export async function runMulter(
  middleware: MulterMiddleware,
  req: any,
  res: any,
): Promise<void> {
  let isReceiving = true;
  const stopWatching = onResponseFinished(res, () => {
    if (isReceiving && !req?.complete && typeof req?.destroy === 'function') {
      req.destroy();
    }
  });
  try {
    await new Promise<void>((resolve, reject) =>
      middleware(req, res, (err: any) =>
        err ? reject(transformException(err)) : resolve(),
      ),
    );
  } finally {
    isReceiving = false;
    stopWatching();
  }
  // multer gives a multipart request a body without a prototype, and leaves
  // any other body alone.
  const body = req?.body;
  if (
    typeof body === 'object' &&
    body !== null &&
    !Object.getPrototypeOf(body)
  ) {
    closeArrayGaps(body);
  }
}

/**
 * Closes the gaps in the arrays of a multipart body once it is parsed, as
 * `qs` does for a urlencoded body. A field name picks the index its value is
 * stored at (`tags[1000]`), which leaves the indexes before it empty: the
 * array is longer than the number of values sent, and what copies it skips
 * the empty slots (class-transformer does, for `ValidationPipe`), so the
 * array that was validated would not be the one the route handler gets.
 * The order of the values is kept.
 */
export function closeArrayGaps(store: object): void {
  // Not recursive, as `fieldNestingDepth` may be lifted.
  const pending: object[] = [store];
  while (pending.length > 0) {
    const container = pending.pop()!;
    // The values rather than the indexes up to `length`, so that the work
    // depends on the number of values: `fieldArrayIndexLimit` may be lifted.
    const values = Object.values(container);
    if (Array.isArray(container) && values.length < container.length) {
      values.forEach((value, index) => (container[index] = value));
      container.length = values.length;
    }
    for (const value of values) {
      if (typeof value === 'object' && value !== null) {
        pending.push(value);
      }
    }
  }
}

function onResponseFinished(res: any, callback: () => void): () => void {
  // A stand-in for a response (e.g. in a unit test) is not watched.
  if (typeof res?.on !== 'function') {
    return () => undefined;
  }
  try {
    return finished(res, callback);
  } catch {
    return () => undefined;
  }
}

/**
 * Fails a multipart request whose field names put a `__proto__` key, or a
 * `constructor.prototype` path, in `req.body` (e.g. `__proto__[x]` or
 * `constructor[prototype][x]`), as the NodeAdapter's JSON and urlencoded
 * parsers do by default: a route handler that copies such a body onto
 * another object (`Object.assign()`, a deep merge) would change that
 * object's prototype. multer has no hook to refuse a field name before it
 * appends it, so the body is checked once multer is done, and the files
 * multer stored for the request are removed first.
 */
export async function rejectPrototypePoisoning(
  storage: any,
  req: any,
): Promise<void> {
  const body = req?.body;
  // multer gives a multipart request a body without a prototype, and leaves
  // any other body (checked by its own parser) alone.
  if (
    typeof body !== 'object' ||
    body === null ||
    Object.getPrototypeOf(body)
  ) {
    return;
  }
  try {
    secureJson.scan(body, { protoAction: 'error', constructorAction: 'error' });
  } catch {
    await removeStoredFiles(storage, req);
    throw new BadRequestException(multerExceptions.INVALID_FIELD_NAME);
  }
}

function removeStoredFiles(storage: any, req: any): Promise<void> {
  return Promise.all(
    storedFiles(req).map(
      file =>
        new Promise<void>(resolve => {
          try {
            storage._removeFile(req, file, () => resolve());
          } catch {
            // The request fails anyway.
            resolve();
          }
        }),
    ),
  ).then(() => undefined);
}

/**
 * Removes the files multer stored for `req` when the route's pipes reject
 * the request (e.g. `ParseFilePipe`): the route handler never sees them, and
 * nothing else would remove them. They are removed once the response has
 * been sent, as an exception filter may still use (or remove) them.
 */
export function removeFilesOnPipeRejection<T>(
  storage: any,
  req: any,
  res: any,
): MonoTypeOperatorFunction<T> {
  return catchError(err => {
    if (isRejectedByPipes(req)) {
      finished(res, () => {
        for (const file of storedFiles(req)) {
          try {
            storage._removeFile(req, file, () => undefined);
          } catch {
            // The request has failed already.
          }
        }
      });
    }
    return throwError(() => err);
  });
}

function storedFiles(req: any): any[] {
  const { file, files } = req;
  if (file) {
    return [file];
  }
  return Array.isArray(files) ? files : Object.values(files ?? {}).flat();
}

// Multer may add in a 'field' property to the error
// https://github.com/expressjs/multer/blob/aa42bea6ac7d0cb8fcb279b15a7278cda805dc63/lib/multer-error.js#L19
export function transformException(
  error: (Error & { field?: string; code?: string }) | undefined,
) {
  if (!error || error instanceof HttpException) {
    return error;
  }
  // Multer identifies its errors by `code`, while the messages may change
  // between releases (e.g. "Unexpected field" became "Unexpected file field")
  const exception = isMulterExceptionCode(error.code)
    ? multerExceptions[error.code]
    : error.message;
  // Keep the original error as the cause, so that an exception filter can
  // read its code and field
  const options = { cause: error };
  switch (exception) {
    case multerExceptions.LIMIT_FILE_SIZE:
      return new PayloadTooLargeException(error.message, options);
    case multerExceptions.LIMIT_FILE_COUNT:
    case multerExceptions.LIMIT_FIELD_KEY:
    case multerExceptions.LIMIT_FIELD_VALUE:
    case multerExceptions.LIMIT_FIELD_COUNT:
    case multerExceptions.LIMIT_FIELD_NESTING:
    case multerExceptions.LIMIT_FIELD_ARRAY_INDEX:
    case multerExceptions.INVALID_FIELD_NAME:
    case multerExceptions.LIMIT_UNEXPECTED_FILE:
    case multerExceptions.LIMIT_PART_COUNT:
    case multerExceptions.MISSING_FIELD_NAME:
      if (error.field) {
        return new BadRequestException(
          `${error.message} - ${error.field}`,
          options,
        );
      }
      return new BadRequestException(error.message, options);
    case busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND:
      return new BadRequestException(error.message, options);
    case busboyExceptions.MULTIPART_MALFORMED_PART_HEADER:
    case busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM:
    case busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FILE:
      return new BadRequestException(`Multipart: ${error.message}`, options);
  }
  // multer accepts any `multipart/*` request, but busboy only parses
  // `multipart/form-data`. The client's content type is left out of the
  // response.
  if (error.message?.startsWith(busboyExceptions.UNSUPPORTED_CONTENT_TYPE)) {
    return new UnsupportedMediaTypeException(
      busboyExceptions.UNSUPPORTED_CONTENT_TYPE,
      options,
    );
  }
  return error;
}

function isMulterExceptionCode(
  code: unknown,
): code is keyof typeof multerExceptions {
  return typeof code === 'string' && Object.hasOwn(multerExceptions, code);
}
