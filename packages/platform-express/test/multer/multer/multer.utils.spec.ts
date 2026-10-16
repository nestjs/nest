import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import multer from 'multer';
import {
  busboyExceptions,
  multerExceptions,
} from '../../../multer/multer/multer.constants.js';
import {
  applyDefaultLimits,
  mergeMulterOptions,
  removeFilesOnPipeRejection,
  transformException,
} from '../../../multer/multer/multer.utils.js';
import { MulterOptions } from '../../../multer/interfaces/multer-options.interface.js';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes.js';
import { lastValueFrom, throwError } from 'rxjs';
import { Readable, Writable } from 'stream';

describe('mergeMulterOptions', () => {
  it('should let local options override top-level global options', () => {
    const merged = mergeMulterOptions({ dest: '/global' }, { dest: '/local' });
    expect(merged.dest).toBe('/local');
  });
  it('should let a local "dest" override a global "storage"', () => {
    const merged = mergeMulterOptions(
      { storage: multer.memoryStorage() },
      { dest: '/local' },
    );
    expect(merged).toEqual({ dest: '/local' });
  });
  it('should keep a global "storage" when the route sets no "dest"', () => {
    const storage = multer.memoryStorage();
    const merged = mergeMulterOptions({ storage }, { preservePath: true });
    expect(merged.storage).toBe(storage);
  });
  it('should merge limits key-by-key instead of replacing the whole object', () => {
    const merged = mergeMulterOptions(
      { limits: { files: 2, fieldNameSize: 100 } },
      { limits: { fileSize: 10 * 1024 * 1024 } },
    );
    expect(merged.limits).toEqual({
      files: 2,
      fieldNameSize: 100,
      fileSize: 10 * 1024 * 1024,
    });
  });
  it('should let local limits win on conflicting keys', () => {
    const merged = mergeMulterOptions(
      { limits: { fileSize: 1024 } },
      { limits: { fileSize: 2048 } },
    );
    expect(merged.limits!.fileSize).toBe(2048);
  });
  it('should work when neither side defines limits', () => {
    const merged = mergeMulterOptions({ dest: '/global' });
    expect(merged.limits).toBeUndefined();
  });
  it('should keep a global function-valued limits when the route sets none', () => {
    const globalLimits = () => ({ fileSize: 10 });
    const merged = mergeMulterOptions({ limits: globalLimits });
    expect(merged.limits).toBe(globalLimits);
  });
  it('should let a route function-valued limits win over a global object', () => {
    const localLimits = () => ({ fileSize: 10 });
    const merged = mergeMulterOptions(
      { limits: { fileSize: 1024, files: 2 } },
      { limits: localLimits },
    );
    expect(merged.limits).toBe(localLimits);
  });
  it('should let a route object win over a global function-valued limits', () => {
    const merged = mergeMulterOptions(
      { limits: () => ({ fileSize: 10 }) },
      { limits: { fileSize: 2048 } },
    );
    expect(merged.limits).toEqual({ fileSize: 2048 });
  });
});

describe('applyDefaultLimits', () => {
  const defaults = { fieldNestingDepth: 32, fieldArrayIndexLimit: 1000 };

  it('should set the field name limits when no limits are set', () => {
    const options = applyDefaultLimits({ dest: '/uploads' });
    expect(options).toEqual({ dest: '/uploads', limits: defaults });
  });

  it('should keep the other limits and the field name limits that are set', () => {
    expect(
      applyDefaultLimits({
        limits: { fileSize: 10, fieldNestingDepth: 0 },
      }).limits,
    ).toEqual({
      fileSize: 10,
      fieldNestingDepth: 0,
      fieldArrayIndexLimit: 1000,
    });
    expect(
      applyDefaultLimits({
        limits: { fieldNestingDepth: Infinity, fieldArrayIndexLimit: Infinity },
      }).limits,
    ).toEqual({ fieldNestingDepth: Infinity, fieldArrayIndexLimit: Infinity });
  });

  it('should set the field name limits that are null or undefined', () => {
    expect(
      applyDefaultLimits({
        limits: { fieldNestingDepth: undefined, fieldArrayIndexLimit: null! },
      }).limits,
    ).toEqual(defaults);
  });

  it('should not modify the options it is given', () => {
    const options = { limits: { fileSize: 10 } };
    applyDefaultLimits(options);
    expect(options).toEqual({ limits: { fileSize: 10 } });
  });

  it('should set the field name limits on the limits a function returns', () => {
    const { limits } = applyDefaultLimits({
      limits: (req: { size: number }) => ({ fileSize: req.size }),
    });
    expect((limits as Function)({ size: 10 })).toEqual({
      fileSize: 10,
      ...defaults,
    });
    expect(
      (applyDefaultLimits({ limits: () => undefined! }).limits as Function)({}),
    ).toEqual(defaults);
  });

  describe('with multer', () => {
    /** Runs `multer(options).none()` over a body with one text field. */
    const parseField = (options: MulterOptions, fieldName: string) => {
      const boundary = 'nestjs';
      const body =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"\r\n\r\n` +
        `x\r\n` +
        `--${boundary}--\r\n`;
      const req = Object.assign(Readable.from([Buffer.from(body)]), {
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': String(Buffer.byteLength(body)),
        },
      });
      return new Promise<any>((resolve, reject) =>
        multer(applyDefaultLimits(options)).none()(
          req as any,
          {} as any,
          (err?: any) => (err ? reject(err) : resolve((req as any).body)),
        ),
      );
    };

    /** Reads `a.b.b...` (`depth` times `b`) out of a parsed body. */
    const dig = (body: any, depth: number) => {
      let value = body.a;
      for (let i = 0; i < depth; i++) {
        value = value.b;
      }
      return value;
    };

    it('should reject names nested deeper than 32 levels by default', async () => {
      expect(dig(await parseField({}, 'a' + '[b]'.repeat(32)), 32)).toBe('x');
      await expect(
        parseField({}, 'a' + '[b]'.repeat(33)),
      ).rejects.toMatchObject({ code: 'LIMIT_FIELD_NESTING' });
    });

    it('should reject array indexes over 1000 by default', async () => {
      expect((await parseField({}, 'a[1000]')).a).toHaveLength(1001);
      await expect(parseField({}, 'a[1001]')).rejects.toMatchObject({
        code: 'LIMIT_FIELD_ARRAY_INDEX',
      });
    });

    it('should apply the defaults to the limits a function returns', async () => {
      await expect(
        parseField({ limits: () => ({}) }, 'a[1001]'),
      ).rejects.toMatchObject({ code: 'LIMIT_FIELD_ARRAY_INDEX' });
    });

    it('should lift the defaults when set to Infinity', async () => {
      const limits = {
        fieldNestingDepth: Infinity,
        fieldArrayIndexLimit: Infinity,
      };
      const body = await parseField(
        { limits },
        'a' + '[b]'.repeat(33) + '[1001]',
      );
      expect(dig(body, 33)).toHaveLength(1002);
    });
  });
});

describe('removeFilesOnPipeRejection', () => {
  const error = new BadRequestException('Validation failed');
  const createStorage = () => ({
    _removeFile: vi.fn((_req, _file, cb) => cb(null)),
  });
  const createResponse = () =>
    new Writable({ write: (_chunk, _encoding, cb) => cb() });
  const fail = (storage: any, req: any, res: Writable) =>
    lastValueFrom(
      throwError(() => error).pipe(
        removeFilesOnPipeRejection(storage, req, res),
      ),
    );

  it.each([
    ['req.file', (file: object) => ({ file })],
    ['req.files', (file: object) => ({ files: [file] })],
    ['req.files by field', (file: object) => ({ files: { docs: [file] } })],
  ])(
    'should remove %s once the response is sent when the pipes rejected the request',
    async (_, createRequest) => {
      const storage = createStorage();
      const file = { fieldname: 'docs', path: '/uploads/a' };
      const req = createRequest(file);
      const res = createResponse();
      markRejectedByPipes(req);

      await expect(fail(storage, req, res)).rejects.toBe(error);
      // An exception filter may still use the files until the response is out.
      expect(storage._removeFile).not.toHaveBeenCalled();
      res.end();

      await vi.waitFor(() =>
        expect(storage._removeFile).toHaveBeenCalledWith(
          req,
          file,
          expect.any(Function),
        ),
      );
    },
  );

  it('should keep the files when the route handler failed', async () => {
    const storage = createStorage();
    const req = { file: { fieldname: 'doc', path: '/uploads/a' } };
    const res = createResponse();

    await expect(fail(storage, req, res)).rejects.toBe(error);
    res.end();
    await new Promise(resolve => setImmediate(resolve));

    expect(storage._removeFile).not.toHaveBeenCalled();
  });
});

describe('transformException', () => {
  describe('if error does not exist', () => {
    it('should behave as identity', () => {
      const err = undefined;
      expect(transformException(err)).toBe(err);
    });
  });
  describe('if error is instance of HttpException', () => {
    it('should behave as identity', () => {
      const err = new HttpException('response', 500);
      expect(transformException(err)).toBe(err);
    });
  });
  describe('if error exists and is not instance of HttpException', () => {
    describe('and is LIMIT_FILE_SIZE exception', () => {
      it('should return "PayloadTooLargeException"', () => {
        const err = { message: multerExceptions.LIMIT_FILE_SIZE };
        expect(transformException(err as any)).toBeInstanceOf(
          PayloadTooLargeException,
        );
      });
    });
    describe('and is multer exception but not a LIMIT_FILE_SIZE', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_KEY };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
      it('should return "BadRequestException" for LIMIT_FIELD_NESTING', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_NESTING };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
      it('should append the field property to the message', () => {
        const err = {
          message: multerExceptions.LIMIT_FIELD_NESTING,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).toBe(
          `${multerExceptions.LIMIT_FIELD_NESTING} - foo`,
        );
      });
    });
    describe('and is busboy/multipart exception', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });

      it('should return "BadRequestException"', () => {
        const err = {
          message: busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
        };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
    });
    describe('and is an error thrown by multer', () => {
      it('should return "BadRequestException" for LIMIT_UNEXPECTED_FILE', () => {
        const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo');
        const result = transformException(err);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe(`${err.message} - photo`);
      });
      it('should return "PayloadTooLargeException" for LIMIT_FILE_SIZE', () => {
        const err = new multer.MulterError('LIMIT_FILE_SIZE', 'avatar');
        expect(transformException(err)).toBeInstanceOf(
          PayloadTooLargeException,
        );
      });
      it('should map by code even when the message differs', () => {
        const err = {
          code: 'LIMIT_UNEXPECTED_FILE',
          message: 'Some other wording',
          field: 'photo',
        };
        const result = transformException(err as any);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe('Some other wording - photo');
      });
      it('should return "BadRequestException" for LIMIT_FIELD_ARRAY_INDEX', () => {
        const err = new multer.MulterError(
          'LIMIT_FIELD_ARRAY_INDEX',
          'tags[99]',
        );
        const result = transformException(err);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe(`${err.message} - tags[99]`);
      });
      it('should return "BadRequestException" for INVALID_FIELD_NAME', () => {
        const err = new multer.MulterError('INVALID_FIELD_NAME', 'a[b]');
        const result = transformException(err);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe(`${err.message} - a[b]`);
      });
      it('should behave as identity for STREAM_DESTROYED', () => {
        // raised by disk storage after the stream was destroyed, not by the
        // client, so it stays a 500
        const err = new multer.MulterError('STREAM_DESTROYED', 'avatar');
        expect(transformException(err)).toBe(err);
      });
      it('should behave as identity for a code that is not a multer code', () => {
        const err = Object.assign(new Error('no such file'), {
          code: 'ENOENT',
        });
        expect(transformException(err)).toBe(err);
      });
    });
    describe(`and has a 'field' property`, () => {
      it('should return the field property appended to the error message', () => {
        const err = {
          message: multerExceptions.LIMIT_UNEXPECTED_FILE,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).toBe(
          `${multerExceptions.LIMIT_UNEXPECTED_FILE} - foo`,
        );
      });
    });
  });
});
