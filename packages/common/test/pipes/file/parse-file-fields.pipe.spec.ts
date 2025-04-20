import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { BadRequestException } from '../../../exceptions';
import { FileValidator, ParseFileFieldsPipe } from '../../../pipes';

use(chaiAsPromised);

class AlwaysValidValidator extends FileValidator {
  isValid(): boolean {
    return true;
  }

  buildErrorMessage(): string {
    return '';
  }
}

const customErrorMessage = 'Custom error message';

class AlwaysInvalidValidator extends FileValidator {
  isValid(): boolean {
    return false;
  }

  buildErrorMessage(): string {
    return customErrorMessage;
  }
}

describe('ParseFileFieldsPipe', () => {
  const images = [
    { fieldname: 'images', mimetype: 'image/png', size: 64 },
    { fieldname: 'images', mimetype: 'image/jpeg', size: 128 },
  ];

  const documents = [
    { fieldname: 'documents', mimetype: 'application/pdf', size: 256 },
  ];

  const extras = [{ fieldname: 'extras', mimetype: 'image/webp', size: 512 }];

  const allFiles = { images, documents, extras };

  describe('transform', () => {
    it('only ouputs files specified in the options', async () => {
      const pipe = new ParseFileFieldsPipe({
        fields: [{ name: 'documents' }, { name: 'images' }],
      });
      const result = await pipe.transform(allFiles);

      expect(Object.keys(result)).to.deep.equal(['documents', 'images']);
    });

    it('should throw when required file is not present', () => {
      const pipe = new ParseFileFieldsPipe({
        fields: [{ name: 'images' }, { name: 'documents' }, { name: 'extras' }],
      });

      return expect(pipe.transform({ images, documents })).to.be.rejectedWith(
        BadRequestException,
        'File is required',
      );
    });

    it('should throw when a file does not pass validation', () => {
      const pipe = new ParseFileFieldsPipe({
        fields: [
          {
            name: 'extras',
            options: {
              validators: [new AlwaysValidValidator({})],
            },
          },
          {
            name: 'documents',
            options: {
              validators: [new AlwaysInvalidValidator({})],
            },
          },
        ],
      });

      expect(pipe.transform({ documents, extras })).to.be.rejectedWith(
        customErrorMessage,
      );
    });
  });

  describe('mergeWithCommonOptions', () => {
    describe('commonOptions', () => {
      it('returns common options when there no field specific options', () => {
        const commonOptions = {
          fileIsRequired: false,
          validators: [new AlwaysValidValidator({})],
          errorHttpStatusCode: 400,
        };
        const pipe = new ParseFileFieldsPipe({
          commonOptions,
          fields: [],
        });

        expect(pipe.mergeWithCommonOptions({})).to.deep.equal({
          ...commonOptions,
          exceptionFactory: undefined,
        });
      });

      it('returns a default options object when there is no options', () => {
        const pipe = new ParseFileFieldsPipe({
          fields: [],
        });

        expect(pipe.mergeWithCommonOptions({})).to.deep.equal({
          fileIsRequired: true,
          errorHttpStatusCode: undefined,
          validators: [],
          exceptionFactory: undefined,
        });
      });
    });

    describe('fileIsRequired', () => {
      it('is by default true', () => {
        const pipe = new ParseFileFieldsPipe({
          fields: [],
        });
        const mergedOptions = pipe.mergeWithCommonOptions({});

        expect(mergedOptions.fileIsRequired).to.be.true;
      });

      it('gives priority to field specific value', () => {
        const pipe = new ParseFileFieldsPipe({
          commonOptions: { fileIsRequired: true },
          fields: [],
        });
        const mergedOptions = pipe.mergeWithCommonOptions({
          fileIsRequired: false,
        });

        expect(mergedOptions.fileIsRequired).to.be.false;
      });
    });

    describe('validators', () => {
      it('commonValidators are listed first', () => {
        const alwaysValid = new AlwaysValidValidator({});
        const alwaysInvalid = new AlwaysInvalidValidator({});
        const pipe = new ParseFileFieldsPipe({
          commonOptions: {
            validators: [alwaysValid],
          },
          fields: [],
        });
        const { validators } = pipe.mergeWithCommonOptions({
          validators: [alwaysInvalid],
        });

        expect(validators!.length).to.equal(2);
        expect(validators![0]).to.equal(alwaysValid);
      });

      it('validators are correctly merged', () => {
        const alwaysValid = new AlwaysValidValidator({});
        const alwaysInvalid = new AlwaysInvalidValidator({});
        const pipe = new ParseFileFieldsPipe({
          commonOptions: {
            validators: [alwaysInvalid],
          },
          fields: [],
        });
        const { validators } = pipe.mergeWithCommonOptions({
          validators: [alwaysValid],
        });

        expect(validators).to.deep.equal([alwaysInvalid, alwaysValid]);
      });
    });

    describe('errorHttpStatusCode and exceptionFactory', () => {
      it('defaults to "undefined"', () => {
        const pipe = new ParseFileFieldsPipe({
          fields: [],
        });
        const mergedOptions = pipe.mergeWithCommonOptions({});

        expect(mergedOptions.errorHttpStatusCode).to.equal(undefined);
        expect(mergedOptions.exceptionFactory).to.equal(undefined);
      });

      it('field specific options have priority', () => {
        const customExceptionFactory = message => new Error(message);
        const pipe = new ParseFileFieldsPipe({
          commonOptions: {
            errorHttpStatusCode: 400,
          },
          fields: [],
        });
        const mergedOptions = pipe.mergeWithCommonOptions({
          errorHttpStatusCode: 422,
          exceptionFactory: customExceptionFactory,
        });

        expect(mergedOptions.errorHttpStatusCode).to.equal(422);
        expect(mergedOptions.exceptionFactory).to.equal(customExceptionFactory);
      });
    });
  });
});
