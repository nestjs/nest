import { expect } from 'chai';
import { MaxFileSizeValidator } from '../../../pipes';

describe('MaxFileSizeValidator', () => {
  const oneKb = 1024;

  describe('isValid', () => {
    it('should return true when the file size is less than the maximum size', () => {
      const maxFileSizeValidator = new MaxFileSizeValidator({
        maxSize: oneKb,
      });

      const requestFile = {
        size: 100,
      } as any;

      expect(maxFileSizeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return false when the file size is greater than the maximum size', () => {
      const maxFileSizeValidator = new MaxFileSizeValidator({
        maxSize: oneKb,
      });

      const requestFile = {
        size: oneKb + 1,
      } as any;

      expect(maxFileSizeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when the file size is equal to the maximum size', () => {
      const maxFileSizeValidator = new MaxFileSizeValidator({
        maxSize: oneKb,
      });

      const requestFile = {
        size: oneKb,
      } as any;

      expect(maxFileSizeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return true when no file provided', () => {
      const maxFileSizeValidator = new MaxFileSizeValidator({
        maxSize: oneKb,
      });

      expect(maxFileSizeValidator.isValid()).to.equal(true);
    });
  });

  describe('buildErrorMessage', () => {
    it('should return a string with the format "Validation failed (expected size is less than #maxSize")', () => {
      const maxFileSizeValidator = new MaxFileSizeValidator({
        maxSize: oneKb,
      });

      expect(maxFileSizeValidator.buildErrorMessage()).to.equal(
        `Validation failed (expected size is less than ${oneKb})`,
      );
    });

    it('should include the file size in the error message when a file is provided', () => {
      const currentFileSize = oneKb + 1;
      const maxFileSizeValidator = new MaxFileSizeValidator({
        maxSize: oneKb,
      });

      const file = { size: currentFileSize } as any;

      expect(maxFileSizeValidator.buildErrorMessage(file)).to.equal(
        `Validation failed (current file size is ${currentFileSize}, expected size is less than ${oneKb})`,
      );
    });
  });
});
