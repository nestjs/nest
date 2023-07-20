import { expect } from 'chai';
import { BaseExceptionFilter } from '../../exceptions/base-exception-filter';
import { HttpStatus } from '@nestjs/common';

describe('BaseExceptionFilter', () => {
  describe('isHttpError', () => {
    const base = new BaseExceptionFilter();

    it('happy path', () => {
      expect(
        base.isHttpError({
          statusCode: 400,
          message: 'Bad Request',
        }),
      ).to.equal('Bad Request');
    });

    it('error is empty', () => {
      expect(base.isHttpError({})).to.be.undefined;
    });

    it('error is Error instance', () => {
      expect(base.isHttpError(new Error())).to.be.undefined;
    });

    it('error is Custom error with statusCode -1', () => {
      class CustomError extends Error {
        statusCode = -1;
      }

      expect(base.isHttpError(new CustomError('Error status -1'))).to.be.false;
    });

    it('error is Custom error with statusCode BAD_REQUEST', () => {
      class CustomError extends Error {
        statusCode = HttpStatus.BAD_REQUEST;
      }

      expect(base.isHttpError(new CustomError('BAD_REQUEST'))).to.equal(
        'BAD_REQUEST',
      );
    });

    it('statusCode is not a valid number', () => {
      expect(
        base.isHttpError({
          statusCode: -1,
          message: 'Bad Request',
        }),
      ).to.be.false;
    });

    it('statusCode is not a number', () => {
      expect(
        base.isHttpError({
          statusCode: '-1',
          message: 'Bad Request',
        }),
      ).to.be.false;
    });
  });
});
