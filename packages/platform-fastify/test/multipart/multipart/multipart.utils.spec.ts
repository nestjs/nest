import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  fastifyMultipartErrorCodes,
  multerExceptions,
} from '../../../multipart/multipart/multipart.constants.js';
import { MultipartError } from '../../../multipart/multipart/multipart.error.js';
import {
  mergeMultipartOptions,
  transformException,
} from '../../../multipart/multipart/multipart.utils.js';
import { memoryStorage } from '../../../multipart/storage/index.js';

describe('mergeMultipartOptions', () => {
  it('should let local options override global options', () => {
    expect(
      mergeMultipartOptions({ dest: '/global' }, { dest: '/local' }),
    ).toEqual({ dest: '/local' });
  });

  it('should let a local "dest" override a global "storage"', () => {
    expect(
      mergeMultipartOptions({ storage: memoryStorage() }, { dest: '/local' }),
    ).toEqual({ dest: '/local' });
  });

  it('should keep a global "storage" when the route sets no "dest"', () => {
    const storage = memoryStorage();
    const merged = mergeMultipartOptions({ storage }, { preservePath: true });
    expect(merged.storage).toBe(storage);
  });

  it('should merge limits key-by-key', () => {
    const merged = mergeMultipartOptions(
      { limits: { files: 2, fileSize: 1 } },
      { limits: { fileSize: 10 } },
    );
    expect(merged.limits).toEqual({ files: 2, fileSize: 10 });
  });

  it('should let a local limits function win outright', () => {
    const limits = () => ({ fileSize: 1 });
    const merged = mergeMultipartOptions({ limits: { files: 2 } }, { limits });
    expect(merged.limits).toBe(limits);
  });

  it('should work without options', () => {
    expect(mergeMultipartOptions()).toEqual({});
  });

  it('should keep the global limits the route sets to null or undefined', () => {
    const merged = mergeMultipartOptions(
      { limits: { fileSize: 1024, files: 2, parts: 10 } },
      { limits: { fileSize: undefined, files: null!, fields: 3 } },
    );
    expect(merged.limits).toEqual({
      fileSize: 1024,
      files: 2,
      parts: 10,
      fields: 3,
    });
  });

  it('should keep the global options the route sets to null or undefined', () => {
    const fileFilter = vi.fn();
    const storage = memoryStorage();
    const limits = { fileSize: 1024 };
    const merged = mergeMultipartOptions(
      { limits, fileFilter, storage },
      { limits: undefined, fileFilter: undefined, storage: null! },
    );
    expect(merged).toEqual({ limits, fileFilter, storage });
  });
});

describe('transformException', () => {
  const fastifyError = (code: string, message = 'x', extra = {}) =>
    Object.assign(new Error(message), { code, ...extra });

  it('should pass through undefined and HttpExceptions', () => {
    expect(transformException(undefined)).toBeUndefined();
    const error = new HttpException('x', 418);
    expect(transformException(error)).toBe(error);
  });

  it('should pass through unknown errors', () => {
    const error = new Error('boom');
    expect(transformException(error)).toBe(error);
  });

  it.each([
    ['FST_FILES_LIMIT', BadRequestException, 'Too many files'],
    ['FST_PARTS_LIMIT', BadRequestException, 'Too many parts'],
    ['FST_FIELDS_LIMIT', BadRequestException, 'Too many fields'],
    ['FST_PROTO_VIOLATION', BadRequestException, 'Invalid field name'],
    ['FST_REQ_FILE_TOO_LARGE', PayloadTooLargeException, 'File too large'],
  ])(
    'should map the @fastify/multipart code %s like multer',
    (code, type, message) => {
      const error = fastifyError(code);
      const result = transformException(error);
      expect(result).toBeInstanceOf(type);
      expect(result!.message).toBe(message);
      const cause = result!.cause as MultipartError;
      expect(cause).toBeInstanceOf(MultipartError);
      expect(cause.code).toBe(fastifyMultipartErrorCodes[code]);
      expect(cause.cause).toBe(error);
    },
  );

  it('should append the field name when the error carries one', () => {
    const error = fastifyError('FST_REQ_FILE_TOO_LARGE', 'x', {
      part: { fieldname: 'avatar' },
    });
    expect(transformException(error)).toEqual(
      new PayloadTooLargeException('File too large', {
        cause: new MultipartError('LIMIT_FILE_SIZE', 'avatar', {
          cause: error,
        }),
      }),
    );
    expect(
      transformException(new MultipartError('LIMIT_UNEXPECTED_FILE', 'f'))!
        .message,
    ).toBe('Unexpected file field - f');
  });

  it.each(Object.keys(multerExceptions) as (keyof typeof multerExceptions)[])(
    'should map MultipartError %s to the multer message',
    code => {
      const error = new MultipartError(code);
      const result = transformException(error);
      expect(result).toBeInstanceOf(
        code === 'LIMIT_FILE_SIZE'
          ? PayloadTooLargeException
          : BadRequestException,
      );
      expect(result!.message).toBe(multerExceptions[code]);
      expect(result!.cause).toBe(error);
    },
  );

  it.each(['FST_MP_PREMATURE_CLOSE', 'FST_INVALID_JSON_FIELD_ERROR'])(
    'should report %s as a 400 with its own message',
    code => {
      const error = fastifyError(code, 'msg');
      expect(transformException(error)).toEqual(
        new BadRequestException('msg', { cause: error }),
      );
    },
  );

  it.each([
    ['Multipart: Boundary not found', 'Multipart: Boundary not found'],
    ['Unexpected end of multipart data', 'Multipart: Unexpected end of form'],
    [
      'Part terminated early due to unexpected end of multipart data',
      'Multipart: Unexpected end of form',
    ],
  ])(
    'should rewrite the @fastify/busboy message "%s" to "%s"',
    (message, expected) => {
      const error = new Error(message);
      expect(transformException(error)).toEqual(
        new BadRequestException(expected, { cause: error }),
      );
    },
  );
});
