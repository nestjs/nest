import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import multer from 'multer';
import {
  busboyExceptions,
  multerExceptions,
} from '../../../multer/multer/multer.constants.js';
import {
  mergeMulterOptions,
  transformException,
} from '../../../multer/multer/multer.utils.js';

describe('mergeMulterOptions', () => {
  it('should let local options override top-level global options', () => {
    const merged = mergeMulterOptions({ dest: '/global' }, { dest: '/local' });
    expect(merged.dest).toBe('/local');
  });
  it('should merge limits key-by-key instead of replacing the whole object', () => {
    const merged = mergeMulterOptions(
      { limits: { files: 2, fieldNameSize: 100 } },
      { limits: { fileSize: 10 * 1024 * 1024 } },
    );
    expect(merged.limits).toEqual({
      files: 2,
      fieldNameSize: 100,
      fileSize: 10 * 1024 * 1024,
    });
  });
  it('should let local limits win on conflicting keys', () => {
    const merged = mergeMulterOptions(
      { limits: { fileSize: 1024 } },
      { limits: { fileSize: 2048 } },
    );
    expect(merged.limits!.fileSize).toBe(2048);
  });
  it('should work when neither side defines limits', () => {
    const merged = mergeMulterOptions({ dest: '/global' });
    expect(merged.limits).toBeUndefined();
  });
  it('should keep a global function-valued limits when the route sets none', () => {
    const globalLimits = () => ({ fileSize: 10 });
    const merged = mergeMulterOptions({ limits: globalLimits });
    expect(merged.limits).toBe(globalLimits);
  });
  it('should let a route function-valued limits win over a global object', () => {
    const localLimits = () => ({ fileSize: 10 });
    const merged = mergeMulterOptions(
      { limits: { fileSize: 1024, files: 2 } },
      { limits: localLimits },
    );
    expect(merged.limits).toBe(localLimits);
  });
  it('should let a route object win over a global function-valued limits', () => {
    const merged = mergeMulterOptions(
      { limits: () => ({ fileSize: 10 }) },
      { limits: { fileSize: 2048 } },
    );
    expect(merged.limits).toEqual({ fileSize: 2048 });
  });
});

describe('transformException', () => {
  describe('if error does not exist', () => {
    it('should behave as identity', () => {
      const err = undefined;
      expect(transformException(err)).toBe(err);
    });
  });
  describe('if error is instance of HttpException', () => {
    it('should behave as identity', () => {
      const err = new HttpException('response', 500);
      expect(transformException(err)).toBe(err);
    });
  });
  describe('if error exists and is not instance of HttpException', () => {
    describe('and is LIMIT_FILE_SIZE exception', () => {
      it('should return "PayloadTooLargeException"', () => {
        const err = { message: multerExceptions.LIMIT_FILE_SIZE };
        expect(transformException(err as any)).toBeInstanceOf(
          PayloadTooLargeException,
        );
      });
    });
    describe('and is multer exception but not a LIMIT_FILE_SIZE', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_KEY };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
      it('should return "BadRequestException" for LIMIT_FIELD_NESTING', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_NESTING };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
      it('should append the field property to the message', () => {
        const err = {
          message: multerExceptions.LIMIT_FIELD_NESTING,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).toBe(
          `${multerExceptions.LIMIT_FIELD_NESTING} - foo`,
        );
      });
    });
    describe('and is busboy/multipart exception', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });

      it('should return "BadRequestException"', () => {
        const err = {
          message: busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
        };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
    });
    describe('and is an error thrown by multer', () => {
      it('should return "BadRequestException" for LIMIT_UNEXPECTED_FILE', () => {
        const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo');
        const result = transformException(err);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe(`${err.message} - photo`);
      });
      it('should return "PayloadTooLargeException" for LIMIT_FILE_SIZE', () => {
        const err = new multer.MulterError('LIMIT_FILE_SIZE', 'avatar');
        expect(transformException(err)).toBeInstanceOf(
          PayloadTooLargeException,
        );
      });
      it('should map by code even when the message differs', () => {
        const err = {
          code: 'LIMIT_UNEXPECTED_FILE',
          message: 'Some other wording',
          field: 'photo',
        };
        const result = transformException(err as any);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe('Some other wording - photo');
      });
      it('should behave as identity for a code that is not a multer code', () => {
        const err = Object.assign(new Error('no such file'), {
          code: 'ENOENT',
        });
        expect(transformException(err)).toBe(err);
      });
    });
    describe(`and has a 'field' property`, () => {
      it('should return the field property appended to the error message', () => {
        const err = {
          message: multerExceptions.LIMIT_UNEXPECTED_FILE,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).toBe(
          `${multerExceptions.LIMIT_UNEXPECTED_FILE} - foo`,
        );
      });
    });
  });
});
