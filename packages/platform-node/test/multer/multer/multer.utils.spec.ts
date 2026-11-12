import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import multer from 'multer';
import {
  busboyExceptions,
  multerExceptions,
} from '../../../multer/multer/multer.constants.js';
import {
  applyDefaultLimits,
  closeArrayGaps,
  mergeMulterOptions,
  rejectPrototypePoisoning,
  removeFilesOnPipeRejection,
  runMulter,
  transformException,
} from '../../../multer/multer/multer.utils.js';
import { MulterOptions } from '../../../multer/interfaces/multer-options.interface.js';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes.js';
import { lastValueFrom, throwError } from 'rxjs';
import { PassThrough, Readable, Writable } from 'stream';

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
  it('should keep the global limits the route sets to null or undefined', () => {
    const merged = mergeMulterOptions(
      { limits: { fileSize: 1024, files: 2, parts: 10 } },
      { limits: { fileSize: undefined, files: null!, fields: 3 } },
    );
    expect(merged.limits).toEqual({
      fileSize: 1024,
      files: 2,
      parts: 10,
      fields: 3,
    });
  });
  it('should keep the global options the route sets to null or undefined', () => {
    const fileFilter = vi.fn();
    const storage = multer.memoryStorage();
    const limits = { fileSize: 1024 };
    const merged = mergeMulterOptions(
      { limits, fileFilter, storage },
      { limits: undefined, fileFilter: undefined, storage: null },
    );
    expect(merged).toEqual({ limits, fileFilter, storage });
    const limitsFn = () => limits;
    expect(
      mergeMulterOptions({ limits: limitsFn }, { limits: null! }).limits,
    ).toBe(limitsFn);
  });
  it('should let a route lift a global limit with Infinity', () => {
    const merged = mergeMulterOptions(
      { limits: { fileSize: 1024 } },
      { limits: { fileSize: Infinity } },
    );
    expect(merged.limits).toEqual({ fileSize: Infinity });
  });
});

describe('applyDefaultLimits', () => {
  const defaults = {
    fieldNestingDepth: 32,
    fieldArrayIndexLimit: 1000,
    parts: 1000,
  };

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
      parts: 1000,
    });
    expect(
      applyDefaultLimits({
        limits: {
          fieldNestingDepth: Infinity,
          fieldArrayIndexLimit: Infinity,
          parts: Infinity,
        },
      }).limits,
    ).toEqual({
      fieldNestingDepth: Infinity,
      fieldArrayIndexLimit: Infinity,
      parts: Infinity,
    });
    expect(applyDefaultLimits({ limits: { parts: 5 } }).limits).toEqual({
      ...defaults,
      parts: 5,
    });
  });

  it('should set the default limits that are null or undefined', () => {
    expect(
      applyDefaultLimits({
        limits: {
          fieldNestingDepth: undefined,
          fieldArrayIndexLimit: null!,
          parts: undefined,
        },
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

  describe('fileFilter', () => {
    const file: any = { fieldname: 'f' };
    const filterWith = (fileFilter: MulterOptions['fileFilter']) =>
      new Promise<[Error | null, boolean]>(resolve =>
        applyDefaultLimits({ fileFilter }).fileFilter!({}, file, (...args) =>
          resolve(args),
        ),
      );

    it('should keep the decision of a filter that calls back', async () => {
      expect(await filterWith((_req, _file, cb) => cb(null, true))).toEqual([
        null,
        true,
      ]);
      const error = new Error('nope');
      expect(await filterWith((_req, _file, cb) => cb(error, false))).toEqual([
        error,
        false,
      ]);
    });

    it('should pass what the filter throws to its callback', async () => {
      const error = new BadRequestException('nope');
      expect(
        await filterWith(() => {
          throw error;
        }),
      ).toEqual([error, false]);
    });

    it('should pass what an async filter rejects with to its callback', async () => {
      const error = new Error('nope');
      expect(
        await filterWith((async () => {
          throw error;
        }) as any),
      ).toEqual([error, false]);
    });

    it('should call back once', async () => {
      const callback = vi.fn();
      applyDefaultLimits({
        fileFilter: (_req, _file, cb) => {
          cb(null, true);
          cb(null, false);
        },
      }).fileFilter!({}, file, callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should rethrow what is thrown once the filter has called back', () => {
      const error = new Error('from the storage engine');
      const { fileFilter } = applyDefaultLimits({
        fileFilter: (_req, _file, cb) => cb(null, true),
      });
      expect(() =>
        fileFilter!({}, file, () => {
          throw error;
        }),
      ).toThrow(error);
    });

    it('should fail the request with what the filter throws, with multer', async () => {
      const boundary = 'nestjs';
      const body =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="f"; filename="a.txt"\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        `x\r\n` +
        `--${boundary}--\r\n`;
      const req = Object.assign(Readable.from([Buffer.from(body)]), {
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': String(Buffer.byteLength(body)),
        },
      });
      const error = new BadRequestException('nope');
      const options = applyDefaultLimits({
        fileFilter: (_req, file) => {
          throw file.originalname === 'a.txt' ? error : new Error();
        },
      });
      await expect(
        new Promise<void>((resolve, reject) =>
          multer(options).single('f')(req as any, {} as any, (err?: any) =>
            err ? reject(err) : resolve(),
          ),
        ),
      ).rejects.toBe(error);
    });
  });

  describe('with multer', () => {
    /** Runs `multer(options).none()` over a body with the given text fields. */
    const parseFields = (options: MulterOptions, fieldNames: string[]) => {
      const boundary = 'nestjs';
      const body =
        fieldNames
          .map(
            name =>
              `--${boundary}\r\n` +
              `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
              `x\r\n`,
          )
          .join('') + `--${boundary}--\r\n`;
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

    /** Runs `multer(options).none()` over a body with one text field. */
    const parseField = (options: MulterOptions, fieldName: string) =>
      parseFields(options, [fieldName]);

    /** `count` distinct field names. */
    const names = (count: number) =>
      Array.from({ length: count }, (_, i) => `f${i}`);

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

    it('should reject more than 1000 parts by default', async () => {
      expect(Object.keys(await parseFields({}, names(1000)))).toHaveLength(
        1000,
      );
      await expect(parseFields({}, names(1001))).rejects.toMatchObject({
        code: 'LIMIT_PART_COUNT',
      });
    });

    it('should count files as parts', async () => {
      const boundary = 'nestjs';
      const body =
        Array.from(
          { length: 1001 },
          (_, i) =>
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="f"; filename="${i}.txt"\r\n` +
            `Content-Type: text/plain\r\n\r\n` +
            `x\r\n`,
        ).join('') + `--${boundary}--\r\n`;
      const req = Object.assign(Readable.from([Buffer.from(body)]), {
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': String(Buffer.byteLength(body)),
        },
      });
      await expect(
        new Promise<void>((resolve, reject) =>
          multer(applyDefaultLimits({})).any()(
            req as any,
            {} as any,
            (err?: any) => (err ? reject(err) : resolve()),
          ),
        ),
      ).rejects.toMatchObject({ code: 'LIMIT_PART_COUNT' });
    });

    it('should apply the parts limit that is set', async () => {
      await expect(
        parseFields({ limits: { parts: 2 } }, names(3)),
      ).rejects.toMatchObject({ code: 'LIMIT_PART_COUNT' });
      const body = await parseFields(
        { limits: { parts: Infinity } },
        names(1001),
      );
      expect(Object.keys(body)).toHaveLength(1001);
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

describe('runMulter', () => {
  const response = () => new Writable({ write: (_chunk, _enc, cb) => cb() });
  const tick = () => new Promise(resolve => setImmediate(resolve));

  it('should settle with what multer calls back with', async () => {
    await expect(
      runMulter((_req, _res, next) => next(), {}, response()),
    ).resolves.toBeUndefined();
    const error = new multer.MulterError('LIMIT_FILE_SIZE', 'f');
    await expect(
      runMulter((_req, _res, next) => next(error), {}, response()),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('should destroy the request when the response is sent while multer is receiving it', async () => {
    const req = new PassThrough();
    const res = response();
    const result = runMulter(
      (r, _res, next) =>
        r.once('close', () => next(new Error('Request closed'))),
      req,
      res,
    );
    res.end();
    await expect(result).rejects.toThrow('Request closed');
    expect(req.destroyed).toBe(true);
  });

  it('should leave a request whose body has been received', async () => {
    const req = Object.assign(new PassThrough(), { complete: true });
    const res = response();
    let next!: (err?: any) => void;
    const result = runMulter((_req, _res, n) => (next = n), req, res);
    res.end();
    await tick();
    expect(req.destroyed).toBe(false);
    next();
    await result;
  });

  it('should close the gaps in the arrays of the body multer parsed', async () => {
    const req: any = {};
    await runMulter(
      (r, _res, next) => {
        r.body = Object.create(null);
        r.body.tags = [];
        r.body.tags[3] = 'b';
        r.body.tags[1] = 'a';
        r.body.user = Object.create(null);
        r.body.user.ids = [];
        r.body.user.ids[1000] = '7';
        next();
      },
      req,
      response(),
    );
    expect(req.body.tags).toEqual(['a', 'b']);
    expect(req.body.user.ids).toEqual(['7']);
  });

  it('should leave a body multer did not parse', async () => {
    const tags = ['a'];
    tags[3] = 'b';
    const req: any = { body: { tags } };
    await runMulter((_req, _res, next) => next(), req, response());
    expect(req.body.tags).toHaveLength(4);
  });

  it('should stop watching the response once multer is done', async () => {
    const req = new PassThrough();
    const res = response();
    await runMulter((_req, _res, next) => next(), req, res);
    res.end();
    await tick();
    expect(req.destroyed).toBe(false);
  });
});

describe('rejectPrototypePoisoning', () => {
  /** Parses a body with the given text fields and one file, with multer. */
  const parse = async (
    fieldNames: string[],
    storage = multer.memoryStorage(),
  ) => {
    const boundary = 'nestjs';
    const body =
      fieldNames
        .map(
          name =>
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
            `x\r\n`,
        )
        .join('') +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="f"; filename="a.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `data\r\n` +
      `--${boundary}--\r\n`;
    const req: any = Object.assign(Readable.from([Buffer.from(body)]), {
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(Buffer.byteLength(body)),
      },
    });
    const instance = multer(applyDefaultLimits({ storage }));
    await runMulter(instance.single('f'), req, {});
    await rejectPrototypePoisoning(instance.storage, req);
    return req;
  };

  it('should fail a body with a __proto__ key and remove the stored files', async () => {
    for (const name of ['__proto__[x]', 'a[__proto__][x]', 'a[0][__proto__]']) {
      const storage = multer.memoryStorage();
      const removeFile = vi.spyOn(storage, '_removeFile');
      await expect(parse([name], storage)).rejects.toEqual(
        new BadRequestException('Invalid field name'),
      );
      expect(removeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fieldname: 'f' }),
        expect.any(Function),
      );
    }
  });

  it('should fail a body with a constructor.prototype path', async () => {
    for (const name of [
      'constructor[prototype][x]',
      'a[constructor][prototype][x]',
    ]) {
      await expect(parse([name])).rejects.toEqual(
        new BadRequestException('Invalid field name'),
      );
    }
  });

  it('should accept other field names', async () => {
    const req = await parse(['constructor', 'a[constructor]', 'prototype[x]']);
    expect({ ...req.body }).toEqual({
      constructor: 'x',
      a: { constructor: 'x' },
      prototype: { x: 'x' },
    });
    expect(req.file.originalname).toBe('a.txt');
  });

  it('should leave a body multer did not parse', async () => {
    const body = JSON.parse('{"__proto__":{"x":1}}');
    await expect(
      rejectPrototypePoisoning(multer.memoryStorage(), { body }),
    ).resolves.toBeUndefined();
  });
});

describe('closeArrayGaps', () => {
  it('should close the gaps of nested arrays and keep the order of the values', () => {
    const inner: any[] = [];
    inner[5] = 'z';
    const outer: any[] = [];
    outer[2] = { list: inner };
    outer[0] = 'first';
    const store = { outer, dense: ['a', 'b'], text: 'x' };
    closeArrayGaps(store);
    expect(store).toEqual({
      outer: ['first', { list: ['z'] }],
      dense: ['a', 'b'],
      text: 'x',
    });
  });

  it('should keep arrays without gaps as they are', () => {
    const dense = ['a', 'b'];
    const store = { dense };
    closeArrayGaps(store);
    expect(store.dense).toBe(dense);
    expect(dense).toEqual(['a', 'b']);
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

  it('should remove the files of a request marked under the registered symbol', async () => {
    const storage = createStorage();
    const file = { fieldname: 'doc', path: '/uploads/a' };
    const req = { file, [Symbol.for('nestjs:rejected-by-pipes')]: true };
    const res = createResponse();

    await expect(fail(storage, req, res)).rejects.toBe(error);
    res.end();

    await vi.waitFor(() =>
      expect(storage._removeFile).toHaveBeenCalledWith(
        req,
        file,
        expect.any(Function),
      ),
    );
  });

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
        const result = transformException(err as any);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.cause).toBe(err);
      });

      it('should return "UnsupportedMediaTypeException" for an unsupported content type', () => {
        const err = new Error(
          'Unsupported content type: multipart/mixed; boundary=x',
        );
        const result = transformException(err);
        expect(result).toBeInstanceOf(UnsupportedMediaTypeException);
        expect(result!.message).toBe('Unsupported content type');
        expect(result!.cause).toBe(err);
      });

      it('should map the error multer raises for a non form-data multipart request', async () => {
        const req = Object.assign(Readable.from([]), {
          headers: {
            'content-type': 'multipart/mixed; boundary=x',
            'content-length': '0',
          },
        });
        const err = await new Promise<any>(resolve =>
          multer().none()(req as any, {} as any, resolve),
        );
        expect(transformException(err)).toBeInstanceOf(
          UnsupportedMediaTypeException,
        );
      });
    });
    describe('and is an error thrown by multer', () => {
      it('should return "BadRequestException" for LIMIT_UNEXPECTED_FILE', () => {
        const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo');
        const result = transformException(err);
        expect(result).toBeInstanceOf(BadRequestException);
        expect(result!.message).toBe(`${err.message} - photo`);
        expect(result!.cause).toBe(err);
      });
      it('should return "PayloadTooLargeException" for LIMIT_FILE_SIZE', () => {
        const err = new multer.MulterError('LIMIT_FILE_SIZE', 'avatar');
        const result = transformException(err);
        expect(result).toBeInstanceOf(PayloadTooLargeException);
        expect(result!.cause).toBe(err);
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
