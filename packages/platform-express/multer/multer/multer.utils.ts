import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { isFunction, isNil } from '@nestjs/common/utils/shared.utils';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import { finished } from 'stream';
import {
  DEFAULT_PARTS_LIMIT,
  multerExceptions,
  busboyExceptions,
} from './multer.constants';
import { MulterOptions } from '../interfaces/multer-options.interface';

type MulterLimits = NonNullable<MulterOptions['limits']>;

/**
 * Merges the module-level (global) multer options with the options of a
 * route's interceptor (local), which win.
 *
 * A local option set to `null` or `undefined` (e.g. an optional
 * configuration value that is not set) keeps the global value, as if it were
 * not set.
 */
export function mergeMulterOptions(
  options: MulterOptions = {},
  localOptions: MulterOptions = {},
): MulterOptions {
  return { ...options, ...withoutNil(localOptions) };
}

function withoutNil<T extends object>(options: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => !isNil(value)),
  ) as Partial<T>;
}

/**
 * Sets `parts`, which multer leaves at `Infinity`, to `DEFAULT_PARTS_LIMIT`
 * wherever it is not set. multer only checks a limit that is present in
 * `limits`, so the default is added to the object, or to the object a
 * function-valued `limits` (multer >= 2.4.0) returns.
 *
 * `fileFilter` is wrapped as well (see `passErrorToCallback()`).
 */
export function applyDefaultLimits<T extends MulterOptions>(options: T): T {
  const limits: unknown = options.limits;
  const { fileFilter } = options;
  return {
    ...options,
    ...(isFunction(fileFilter) && {
      fileFilter: passErrorToCallback(fileFilter),
    }),
    limits:
      typeof limits === 'function'
        ? (req: any) => withDefaultLimits(limits(req))
        : withDefaultLimits(limits as MulterLimits | null | undefined),
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
 * Set on a request whose pipes rejected it, by the router of
 * `@nestjs/core` (see `markRejectedByPipes()` there). Read through the
 * registered symbol rather than an import, so this package still loads with
 * a version of `@nestjs/core` that does not set it.
 */
const REJECTED_BY_PIPES = Symbol.for('nestjs:rejected-by-pipes');

function isRejectedByPipes(req: any): boolean {
  return req?.[REJECTED_BY_PIPES] === true;
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
  switch (exception) {
    case multerExceptions.LIMIT_FILE_SIZE:
      return new PayloadTooLargeException(error.message);
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
        return new BadRequestException(`${error.message} - ${error.field}`);
      }
      return new BadRequestException(error.message);
    case busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND:
      return new BadRequestException(error.message);
    case busboyExceptions.MULTIPART_MALFORMED_PART_HEADER:
    case busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM:
    case busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FILE:
      return new BadRequestException(`Multipart: ${error.message}`);
  }
  return error;
}

function isMulterExceptionCode(
  code: unknown,
): code is keyof typeof multerExceptions {
  return (
    typeof code === 'string' &&
    Object.prototype.hasOwnProperty.call(multerExceptions, code)
  );
}
