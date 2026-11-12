import { HttpStatus } from '../../../enums/index.js';
import {
  BadRequestException,
  ConflictException,
} from '../../../exceptions/index.js';
import { FileValidator, ParseFilePipe } from '../../../pipes/index.js';

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

// Mirrors the real behavior of built-in validators (e.g. MaxFileSizeValidator,
// FileTypeValidator), which treat a missing file as trivially valid and skip
// their own check rather than failing.
class SkipsValidationWhenNoFileValidator extends FileValidator {
  isValid(file?: unknown): boolean {
    return !file;
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

        await expect(parseFilePipe.transform(requestFile)).resolves.toEqual(
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

        await expect(parseFilePipe.transform(requestFile)).resolves.toEqual(
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

        await expect(parseFilePipe.transform(requestFile)).resolves.toEqual(
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

          await expect(parseFilePipe.transform(requestFile)).rejects.toThrow(
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

          await expect(parseFilePipe.transform(requestFile)).rejects.toThrow(
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

        await expect(parseFilePipe.transform(requestFile)).resolves.toEqual(
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

        await expect(parseFilePipe.transform(requestFile)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw an error if the file is null', async () => {
        const requestFile = null;

        await expect(parseFilePipe.transform(requestFile)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should pass validation if a file is provided', async () => {
        const requestFile = {
          path: 'some-path',
        };

        await expect(parseFilePipe.transform(requestFile)).resolves.toEqual(
          requestFile,
        );
      });
    });

    describe('when the file is null and a validator that skips missing files is registered', () => {
      beforeEach(() => {
        parseFilePipe = new ParseFilePipe({
          validators: [new SkipsValidationWhenNoFileValidator({})],
        });
      });

      it('should throw a "File is required" error instead of letting the validator silently pass', async () => {
        const requestFile = null;

        await expect(parseFilePipe.transform(requestFile)).rejects.toThrow(
          BadRequestException,
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

        await expect(parseFilePipe.transform(requestFile)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('when an array of files is validated', () => {
      class TrackingValidator extends FileValidator<{ id: number }> {
        active = 0;
        maxActive = 0;
        readonly seen: number[] = [];

        async isValid(file: { id: number; valid?: boolean }) {
          this.seen.push(file.id);
          this.active++;
          this.maxActive = Math.max(this.maxActive, this.active);
          await new Promise(resolve => setImmediate(resolve));
          this.active--;
          return file.valid !== false;
        }
        buildErrorMessage(file: { id: number }): string {
          return `file ${file.id} is invalid`;
        }
      }

      it('should validate one file at a time', async () => {
        const validator = new TrackingValidator({});
        parseFilePipe = new ParseFilePipe({ validators: [validator] });
        const files = [{ id: 1 }, { id: 2 }, { id: 3 }];

        await expect(parseFilePipe.transform(files)).resolves.toBe(files);
        expect(validator.maxActive).toBe(1);
        expect(validator.seen).toEqual([1, 2, 3]);
      });

      it('should stop at the first invalid file', async () => {
        const validator = new TrackingValidator({});
        parseFilePipe = new ParseFilePipe({ validators: [validator] });
        const files = [{ id: 1 }, { id: 2, valid: false }, { id: 3 }];

        await expect(parseFilePipe.transform(files)).rejects.toThrow(
          'file 2 is invalid',
        );
        expect(validator.seen).toEqual([1, 2]);
      });
    });
  });
});
