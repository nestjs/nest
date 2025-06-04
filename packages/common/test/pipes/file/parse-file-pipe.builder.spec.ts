import { expect } from 'chai';
import {
  FileValidator,
  MaxFileSizeValidator,
  ParseFilePipeBuilder,
  FileTypeValidator,
} from '../../../pipes';

describe('ParseFilePipeBuilder', () => {
  let parseFilePipeBuilder: ParseFilePipeBuilder;

  beforeEach(() => {
    parseFilePipeBuilder = new ParseFilePipeBuilder();
  });

  describe('build', () => {
    describe('when no validator was passed', () => {
      it('should return a ParseFilePipe with no validators', () => {
        const parseFilePipe = parseFilePipeBuilder.build();
        expect(parseFilePipe.getValidators()).to.be.empty;
      });
    });

    describe('when addMaxSizeValidator was chained', () => {
      it('should return a ParseFilePipe with MaxSizeValidator and given options', () => {
        const options = {
          maxSize: 1000,
        };
        const parseFilePipe = parseFilePipeBuilder
          .addMaxSizeValidator(options)
          .build();

        expect(parseFilePipe.getValidators()).to.deep.include(
          new MaxFileSizeValidator(options),
        );
      });
    });

    describe('when addFileTypeValidator was chained', () => {
      it('should return a ParseFilePipe with FileTypeValidator and given options', () => {
        const options = {
          fileType: 'image/jpeg',
        };
        const parseFilePipe = parseFilePipeBuilder
          .addFileTypeValidator(options)
          .build();

        const validators = parseFilePipe.getValidators();
        const fileTypeValidator = validators.find(
          v => v instanceof FileTypeValidator,
        );

        expect(fileTypeValidator).to.exist;
      });
    });

    describe('when custom validator was chained', () => {
      it('should return a ParseFilePipe with TestFileValidator and given options', () => {
        class TestFileValidator extends FileValidator<{ name: string }> {
          buildErrorMessage(file: any): string {
            return 'TestFileValidator failed';
          }

          isValid(file: any): boolean | Promise<boolean> {
            return true;
          }
        }

        const options = {
          name: 'test',
        };

        const parseFilePipe = parseFilePipeBuilder
          .addValidator(new TestFileValidator(options))
          .build();

        expect(parseFilePipe.getValidators()).to.deep.include(
          new TestFileValidator(options),
        );
      });
    });

    describe('when it is called twice with different validators', () => {
      it('should not reuse validators', () => {
        const maxSizeValidatorOptions = {
          maxSize: 1000,
        };

        const pipeWithMaxSizeValidator = parseFilePipeBuilder
          .addMaxSizeValidator(maxSizeValidatorOptions)
          .build();

        const fileTypeValidatorOptions = {
          fileType: 'image/jpeg',
        };

        const pipeWithFileTypeValidator = parseFilePipeBuilder
          .addFileTypeValidator(fileTypeValidatorOptions)
          .build();

        expect(pipeWithFileTypeValidator.getValidators()).not.to.deep.equal(
          pipeWithMaxSizeValidator.getValidators(),
        );
      });
    });

    describe('when addFileTypeValidator was chained with enhanced fallback logic', () => {
      it('should validate a file with octet-stream mimetype and known extension (e.g., .csv)', async () => {
        const options = {
          fileType: 'text/csv',
          fallbackToMimetype: true,
        };

        const file: any = {
          mimetype: 'application/octet-stream',
          size: 100,
          buffer: Buffer.from('some,data\nanother,row'),
          originalname: 'sample.csv',
        };

        const parseFilePipe = parseFilePipeBuilder
          .addFileTypeValidator(options)
          .build();

        const validators = parseFilePipe.getValidators();
        const validator = validators.find(v => v instanceof FileTypeValidator);

        expect(validator).to.exist;
        expect(await validator?.isValid(file)).to.be.true;
      });

      it('should fail validation if octet-stream file has unknown extension (e.g., .xyz)', async () => {
        const options = {
          fileType: 'application/json',
          fallbackToMimetype: true,
        };

        const file: any = {
          mimetype: 'application/octet-stream',
          size: 100,
          buffer: Buffer.from('{}'),
          originalname: 'unknown.xyz',
        };

        const parseFilePipe = parseFilePipeBuilder
          .addFileTypeValidator(options)
          .build();

        const validators = parseFilePipe.getValidators();
        const validator = validators.find(v => v instanceof FileTypeValidator);

        expect(validator).to.exist;
        expect(await validator?.isValid(file)).to.be.false;
      });

      it('should validate a file using mimetype fallback when magic number fails', async () => {
        const options = {
          fileType: 'application/json',
          fallbackToMimetype: true,
        };

        const file: any = {
          mimetype: 'application/json',
          size: 100,
          buffer: Buffer.from('{}'), // Insufficient for magic number detection
          originalname: 'data.json',
        };

        const parseFilePipe = parseFilePipeBuilder
          .addFileTypeValidator(options)
          .build();

        const validators = parseFilePipe.getValidators();
        const validator = validators.find(v => v instanceof FileTypeValidator);

        expect(validator).to.exist;
        expect(await validator?.isValid(file)).to.be.true;
      });
    });
  });
});
