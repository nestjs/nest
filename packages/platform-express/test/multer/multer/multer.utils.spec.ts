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
import { transformException } from '../../../multer/multer/multer.utils.js';

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
      it('should return "BadRequestException" for LIMIT_FIELD_ARRAY_INDEX', () => {
        const err = new multer.MulterError(
          'LIMIT_FIELD_ARRAY_INDEX',
          'tags[99]',
        );
        const result = transformException(err);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe(`${err.message} - tags[99]`);
      });
      it('should return "BadRequestException" for INVALID_FIELD_NAME', () => {
        const err = new multer.MulterError('INVALID_FIELD_NAME', 'a[b]');
        const result = transformException(err);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe(`${err.message} - a[b]`);
      });
      it('should behave as identity for STREAM_DESTROYED', () => {
        // raised by disk storage after the stream was destroyed, not by the
        // client, so it stays a 500
        const err = new multer.MulterError('STREAM_DESTROYED', 'avatar');
        expect(transformException(err)).toBe(err);
      });
      it('should behave as identity for a code that is not a multer code', () => {
        const err = Object.assign(new Error('no such file'), {
          code: 'ENOENT',
        });
        expect(transformException(err)).toBe(err);
      });
    });
    describe(`and has a 'field' property`, () => {
      it('should return the field propery appended to the error message', () => {
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
