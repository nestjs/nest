import { FileTypeValidator } from '../../../pipes';
import { expect } from 'chai';

describe('FileTypeValidator', () => {
  describe('isValid', () => {
    it('should return true when the file mimetype is the same as the specified', () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      const requestFile = {
        mimetype: 'image/jpeg',
      };

      expect(fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return false when the file mimetype is different from the specified', () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      const requestFile = {
        mimetype: 'image/png',
      };

      expect(fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when the file mimetype was not provided', () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      const requestFile = {};

      expect(fileTypeValidator.isValid(requestFile)).to.equal(false);
    });
  });

  describe('buildErrorMessage', () => {
    it('should return a string with the format "Validation failed (expected type is #fileType)"', () => {
      const fileType = 'image/jpeg';
      const fileTypeValidator = new FileTypeValidator({
        fileType,
      });

      expect(fileTypeValidator.buildErrorMessage()).to.equal(
        `Validation failed (expected type is ${fileType})`,
      );
    });
  });
});
