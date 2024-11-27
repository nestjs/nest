import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { expect } from 'chai';
import {
  busboyExceptions,
  multerExceptions,
} from '../../../multer/multer/multer.constants';
import { transformException } from '../../../multer/multer/multer.utils';

describe('transformException', () => {
  describe('if error does not exist', () => {
    it('should behave as identity', () => {
      const err = undefined;
      expect(transformException(err)).to.be.eq(err);
    });
  });
  describe('if error is instance of HttpException', () => {
    it('should behave as identity', () => {
      const err = new HttpException('response', 500);
      expect(transformException(err)).to.be.eq(err);
    });
  });
  describe('if error exists and is not instance of HttpException', () => {
    describe('and is LIMIT_FILE_SIZE exception', () => {
      it('should return "PayloadTooLargeException"', () => {
        const err = { message: multerExceptions.LIMIT_FILE_SIZE };
        expect(transformException(err as any)).to.be.instanceof(
          PayloadTooLargeException,
        );
      });
    });
    describe('and is multer exception but not a LIMIT_FILE_SIZE', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_KEY };
        expect(transformException(err as any)).to.be.instanceof(
          BadRequestException,
        );
      });
    });
    describe('and is busboy/multipart exception', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND };
        expect(transformException(err as any)).to.be.instanceof(
          BadRequestException,
        );
      });

      it('should return "BadRequestException"', () => {
        const err = {
          message: busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
        };
        expect(transformException(err as any)).to.be.instanceof(
          BadRequestException,
        );
      });
    });
    describe(`and has a 'field' property`, () => {
      it('should return the field propery appended to the error message', () => {
        const err = {
          message: multerExceptions.LIMIT_UNEXPECTED_FILE,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).to.equal(
          `${multerExceptions.LIMIT_UNEXPECTED_FILE} - foo`,
        );
      });
    });
  });
});
