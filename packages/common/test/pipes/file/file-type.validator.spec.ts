import { expect } from 'chai';
import { IFile } from '../../../../common/pipes/file/interfaces';
import { FileTypeValidator } from '../../../pipes';

const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

const jpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);

describe('FileTypeValidator', () => {
  describe('isValid', () => {
    describe('support file types', () => {
      async function testFileByMimeType(mimeType, fileData) {
        const fileTypeValidator = new FileTypeValidator({
          fileType: mimeType,
        });

        const requestFile = {
          mimetype: mimeType,
          buffer: fileData,
        } as IFile;

        expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
      }

      it('should be able to validate a JPEG file', () => {
        return testFileByMimeType('image/jpeg', jpegBuffer);
      });

      it('should be able to validate a PNG file', () => {
        return testFileByMimeType('image/png', pngBuffer);
      });
    });

    it('should return true when the file buffer matches the specified file extension', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'jpeg',
      });

      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFile;
      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return true when the file buffer matches the specified regexp', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: /^image\//,
      });

      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return false when the file buffer does not match the specified type', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg', // Spoofed mimetype
        buffer: pngBuffer,
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when the file buffer does not match the specified file extension', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'jpeg',
      });

      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const requestFile = {
        mimetype: 'image/png',
        buffer: pngBuffer,
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when no buffer is provided', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      const requestFile = {
        mimetype: 'image/jpeg',
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when no file is provided', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      expect(await fileTypeValidator.isValid()).to.equal(false);
    });

    it('should return false when no buffer is provided', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      const requestFile = {
        mimetype: 'image/jpeg',
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return true when the file buffer matches the specified regexp', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: /^image\//,
      });

      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return true when no validation options are provided', async () => {
      const fileTypeValidator = new FileTypeValidator({} as any);
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should skip magic numbers validation when the skipMagicNumbersValidation is true', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
        skipMagicNumbersValidation: true,
      });

      const requestFile = {
        mimetype: 'image/jpeg',
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return false when the file buffer does not match any known type', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'unknown/type',
      });

      const unknownBuffer = Buffer.from([
        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
      ]);
      const requestFile = {
        mimetype: 'unknown/type',
        buffer: unknownBuffer,
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when the buffer is empty', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'image/jpeg',
      });

      const emptyBuffer = Buffer.from([]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: emptyBuffer,
      } as IFile;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });
  });

  describe('buildErrorMessage', () => {
    it('should return a string with the format "Validation failed (expected type is #fileType)"', async () => {
      const fileType = 'image/jpeg';
      const fileTypeValidator = new FileTypeValidator({
        fileType,
      });

      expect(fileTypeValidator.buildErrorMessage()).to.equal(
        `Validation failed (expected type is ${fileType})`,
      );
    });

    it('should include the file type in the error message when a file is provided', async () => {
      const currentFileType = 'image/png';
      const fileType = 'image/jpeg';
      const fileTypeValidator = new FileTypeValidator({
        fileType,
      });

      const file = { mimetype: currentFileType } as IFile;

      expect(fileTypeValidator.buildErrorMessage(file)).to.equal(
        `Validation failed (current file type is ${currentFileType}, expected type is ${fileType})`,
      );
    });

    it('should handle regexp file type in error message', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: /^image\//,
      });
      const file = { mimetype: 'application/pdf' } as IFile;

      expect(fileTypeValidator.buildErrorMessage(file)).to.equal(
        `Validation failed (current file type is application/pdf, expected type is /^image\\//)`,
      );
    });

    it('should handle file extension in error message', async () => {
      const fileTypeValidator = new FileTypeValidator({
        fileType: 'jpeg',
      });
      const file = { mimetype: 'image/png' } as IFile;

      expect(fileTypeValidator.buildErrorMessage(file)).to.equal(
        'Validation failed (current file type is image/png, expected type is jpeg)',
      );
    });
  });
});
