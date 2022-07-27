import { HttpStatus } from '../../../enums';
import { BadRequestException, ConflictException } from '../../../exceptions';
import { FileValidator, ParseFilePipe } from '../../../pipes';
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
        const requestFile = {
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
        const requestFile = {
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
        const requestFile = {
          path: 'some-path',
        };

        await expect(parseFilePipe.transform(requestFile)).to.eventually.eql(
          requestFile,
        );
      });
    });

    describe('when some validator invalidates the file', () => {
      describe('and the pipe has the default error', () => {
        beforeEach(() => {
          parseFilePipe = new ParseFilePipe({
            validators: [new AlwaysInvalidValidator({})],
          });
        });

        it('should throw a BadRequestException', async () => {
          const requestFile = {
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
          const requestFile = {
            path: 'some-path',
          };

          await expect(parseFilePipe.transform(requestFile)).to.be.rejectedWith(
            ConflictException,
          );
        });
      });
    });

    describe('when fileIsRequired is false', () => {
      beforeEach(() => {
        parseFilePipe = new ParseFilePipe({
          validators: [],
          fileIsRequired: false,
        });
      });

      it('should pass validation if no file is provided', async () => {
        const requestFile = undefined;

        await expect(parseFilePipe.transform(requestFile)).to.eventually.eql(
          requestFile,
        );
      });
    });

    describe('when fileIsRequired is true', () => {
      beforeEach(() => {
        parseFilePipe = new ParseFilePipe({
          validators: [],
          fileIsRequired: true,
        });
      });

      it('should throw an error if no file is provided', async () => {
        const requestFile = undefined;

        await expect(parseFilePipe.transform(requestFile)).to.be.rejectedWith(
          BadRequestException,
        );
      });

      it('should pass validation if a file is provided', async () => {
        const requestFile = {
          path: 'some-path',
        };

        await expect(parseFilePipe.transform(requestFile)).to.eventually.eql(
          requestFile,
        );
      });
    });

    describe('when fileIsRequired is not explicitly provided', () => {
      beforeEach(() => {
        parseFilePipe = new ParseFilePipe({
          validators: [new AlwaysInvalidValidator({})],
        });
      });

      it('should throw an error if no file is provided', async () => {
        const requestFile = undefined;

        await expect(parseFilePipe.transform(requestFile)).to.be.rejectedWith(
          BadRequestException,
        );
      });
    });
  });
});
