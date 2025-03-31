import { expect } from 'chai';
import { MagicFileTypeValidator } from '../../../pipes/file/magic-file-type.validator';
import { IFileWithBuffer } from '@nestjs/common/pipes/file/interfaces';

describe('MagicFileTypeValidator', () => {
  describe('isValid', () => {
    it('should return true when the file buffer matches the specified type', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'image/jpeg',
      });

      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return true when the file buffer matches the specified file extension', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'jpeg',
      });

      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFileWithBuffer;
      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return true when the file buffer matches the specified regexp', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: /^image\//,
      });

      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return false when the file buffer does not match the specified type', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'image/jpeg',
      });

      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg', // Spoofed mimetype
        buffer: pngBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when the file buffer does not match the specified file extension', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'jpeg',
      });

      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const requestFile = {
        mimetype: 'image/png',
        buffer: pngBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when no buffer is provided', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'image/jpeg',
      });

      const requestFile = {
        mimetype: 'image/jpeg',
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when no file is provided', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'image/jpeg',
      });

      expect(await fileTypeValidator.isValid()).to.equal(false);
    });

    it('should return false when no buffer is provided', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'image/jpeg',
      });

      const requestFile = {
        mimetype: 'image/jpeg',
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return true when the file buffer matches the specified regexp', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: /^image\//,
      });

      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(true);
    });

    it('should return false when no validation options are provided', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({} as any);
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when the file buffer does not match any known type', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'unknown/type',
      });

      const unknownBuffer = Buffer.from([
        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
      ]);
      const requestFile = {
        mimetype: 'unknown/type',
        buffer: unknownBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });

    it('should return false when the buffer is empty', async () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'image/jpeg',
      });

      const emptyBuffer = Buffer.from([]);
      const requestFile = {
        mimetype: 'image/jpeg',
        buffer: emptyBuffer,
      } as IFileWithBuffer;

      expect(await fileTypeValidator.isValid(requestFile)).to.equal(false);
    });
  });

  describe('buildErrorMessage', () => {
    it('should return a string with the format "Validation failed (expected type is #fileType)"', () => {
      const fileType = 'image/jpeg';
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType,
      });

      expect(fileTypeValidator.buildErrorMessage()).to.equal(
        `Validation failed (expected type is ${fileType})`,
      );
    });

    it('should include the file type in the error message when a file is provided', () => {
      const currentFileType = 'image/png';
      const fileType = 'image/jpeg';
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType,
      });

      const file = { mimetype: currentFileType } as IFileWithBuffer;

      expect(fileTypeValidator.buildErrorMessage(file)).to.equal(
        `Validation failed (detected file type is ${currentFileType}, expected type is ${fileType})`,
      );
    });

    it('should handle regexp file type in error message', () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: /^image\//,
      });
      const file = { mimetype: 'application/pdf' } as IFileWithBuffer;

      expect(fileTypeValidator.buildErrorMessage(file)).to.equal(
        `Validation failed (detected file type is application/pdf, expected type is /^image\\//)`,
      );
    });

    it('should handle file extension in error message', () => {
      const fileTypeValidator = new MagicFileTypeValidator({
        fileType: 'jpeg',
      });
      const file = { mimetype: 'image/png' } as IFileWithBuffer;

      expect(fileTypeValidator.buildErrorMessage(file)).to.equal(
        'Validation failed (detected file type is image/png, expected type is jpeg)',
      );
    });
  });
});
