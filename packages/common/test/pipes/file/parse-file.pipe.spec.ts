import { HttpStatus } from '@nestjs/common/enums';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common/exceptions';
import { FileValidator, ParseFilePipe } from '@nestjs/common/pipes';
import { expect } from 'chai';

class AlwaysValidValidator extends FileValidator {
  isValid(): boolean {
    return true;
  }
  buildErrorMessage(): string {
    return '';
  }
}

const customErrorMessage = 'Error!';

class AlwaysInvalidValidator extends FileValidator {
  isValid(): boolean {
    return false;
  }
  buildErrorMessage(): string {
    return customErrorMessage;
  }
}

describe('ParseFilePipe', () => {
  let parseFilePipe: ParseFilePipe;
  describe('transform', () => {
    describe('when there are no validators (explicit)', () => {
      beforeEach(() => {
        parseFilePipe = new ParseFilePipe({
          validators: [],
        });
      });

      it('should return the file object', async () => {
        const requestFile: Partial<Express.Multer.File> = {
          path: 'some-path',
        };

        await expect(parseFilePipe.transform(requestFile)).to.eventually.eql(
          requestFile,
        );
      });
    });

    describe('when there are no validators (by default constructor)', () => {
      beforeEach(() => {
        parseFilePipe = new ParseFilePipe();
      });

      it('should return the file object', async () => {
        const requestFile: Partial<Express.Multer.File> = {
          path: 'some-path',
        };

        await expect(parseFilePipe.transform(requestFile)).to.eventually.eql(
          requestFile,
        );
      });
    });

    describe('when all the validators validate the file', () => {
      beforeEach(() => {
        parseFilePipe = new ParseFilePipe({
          validators: [new AlwaysValidValidator({})],
        });
      });

      it('should return the file object', async () => {
        const requestFile: Partial<Express.Multer.File> = {
          path: 'some-path',
        };

        await expect(parseFilePipe.transform(requestFile)).to.eventually.eql(
          requestFile,
        );
      });
    });

    describe('when some the validator invalidates the file', () => {
      describe('and the pipe has the default error', () => {
        beforeEach(() => {
          parseFilePipe = new ParseFilePipe({
            validators: [new AlwaysInvalidValidator({})],
          });
        });

        it('should throw a BadRequestException', async () => {
          const requestFile: Partial<Express.Multer.File> = {
            path: 'some-path',
          };

          await expect(parseFilePipe.transform(requestFile)).to.be.rejectedWith(
            BadRequestException,
          );
        });
      });

      describe('and the pipe has a custom error code', () => {
        beforeEach(() => {
          parseFilePipe = new ParseFilePipe({
            validators: [new AlwaysInvalidValidator({})],
            errorHttpStatusCode: HttpStatus.CONFLICT,
          });
        });

        it('should throw this custom Error', async () => {
          const requestFile: Partial<Express.Multer.File> = {
            path: 'some-path',
          };

          await expect(parseFilePipe.transform(requestFile)).to.be.rejectedWith(
            ConflictException,
          );
        });
      });
    });
  });
});
