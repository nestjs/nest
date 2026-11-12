import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { EventEmitter } from 'events';
import * as multer from 'multer';
import {
  busboyExceptions,
  multerExceptions,
} from '../../../multer/multer/multer.constants';
import {
  applyDefaultLimits,
  closeArrayGaps,
  mergeMulterOptions,
  removeFilesOnPipeRejection,
  runMulter,
  transformException,
} from '../../../multer/multer/multer.utils';
import { MulterOptions } from '../../../multer/interfaces/multer-options.interface';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes';
import { lastValueFrom, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { PassThrough, Readable, Writable } from 'stream';

chai.use(chaiAsPromised);

describe('mergeMulterOptions', () => {
  it('should let local options override global options', () => {
    const merged = mergeMulterOptions(
      { dest: '/global', limits: { fileSize: 1024 } },
      { dest: '/local', limits: { files: 2 } },
    );
    expect(merged).to.deep.equal({ dest: '/local', limits: { files: 2 } });
  });
  it('should keep the global options the route sets to null or undefined', () => {
    const fileFilter = sinon.spy();
    const storage = (multer as any).memoryStorage();
    const limits = { fileSize: 1024 };
    const merged = mergeMulterOptions(
      { limits, fileFilter, storage },
      { limits: undefined, fileFilter: undefined, storage: null },
    );
    expect(merged).to.deep.equal({ limits, fileFilter, storage });
  });
  it('should accept missing options', () => {
    expect(mergeMulterOptions(undefined, { dest: '/local' })).to.deep.equal({
      dest: '/local',
    });
    expect(mergeMulterOptions({ dest: '/global' }, undefined)).to.deep.equal({
      dest: '/global',
    });
  });
});

describe('applyDefaultLimits', () => {
  const defaults = { parts: 1000 };

  it('should set the parts limit when no limits are set', () => {
    const options = applyDefaultLimits({ dest: '/uploads' });
    expect(options).to.deep.equal({ dest: '/uploads', limits: defaults });
  });

  it('should keep the other limits and the parts limit that is set', () => {
    expect(
      applyDefaultLimits({ limits: { fileSize: 10 } }).limits,
    ).to.deep.equal({ fileSize: 10, parts: 1000 });
    expect(
      applyDefaultLimits({ limits: { parts: Infinity } }).limits,
    ).to.deep.equal({ parts: Infinity });
    expect(applyDefaultLimits({ limits: { parts: 5 } }).limits).to.deep.equal({
      parts: 5,
    });
  });

  it('should set the parts limit when it is null or undefined', () => {
    expect(
      applyDefaultLimits({ limits: { parts: undefined } }).limits,
    ).to.deep.equal(defaults);
    expect(
      applyDefaultLimits({ limits: { parts: null! } }).limits,
    ).to.deep.equal(defaults);
  });

  it('should not modify the options it is given', () => {
    const options = { limits: { fileSize: 10 } };
    applyDefaultLimits(options);
    expect(options).to.deep.equal({ limits: { fileSize: 10 } });
  });

  it('should set the parts limit on the limits a function returns', () => {
    const { limits } = applyDefaultLimits({
      limits: ((req: { size: number }) => ({ fileSize: req.size })) as any,
    });
    expect((limits as any)({ size: 10 })).to.deep.equal({
      fileSize: 10,
      ...defaults,
    });
    expect(
      (applyDefaultLimits({ limits: (() => undefined) as any }).limits as any)(
        {},
      ),
    ).to.deep.equal(defaults);
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
      expect(
        await filterWith((_req, _file, cb) => cb(null, true)),
      ).to.deep.equal([null, true]);
      const error = new Error('nope');
      const [passed, accepted] = await filterWith((_req, _file, cb) =>
        cb(error, false),
      );
      expect(passed).to.equal(error);
      expect(accepted).to.be.false;
    });

    it('should pass what the filter throws to its callback', async () => {
      const error = new BadRequestException('nope');
      const [passed, accepted] = await filterWith(() => {
        throw error;
      });
      expect(passed).to.equal(error);
      expect(accepted).to.be.false;
    });

    it('should pass what an async filter rejects with to its callback', async () => {
      const error = new Error('nope');
      const [passed, accepted] = await filterWith((async () => {
        throw error;
      }) as any);
      expect(passed).to.equal(error);
      expect(accepted).to.be.false;
    });

    it('should call back once', async () => {
      const callback = sinon.spy();
      applyDefaultLimits({
        fileFilter: (_req, _file, cb) => {
          cb(null, true);
          cb(null, false);
        },
      }).fileFilter!({}, file, callback);
      expect(callback.calledOnce).to.be.true;
      expect(callback.calledWith(null, true)).to.be.true;
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
      ).to.throw(error);
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
          (multer as any)(options).single('f')(
            req as any,
            {} as any,
            (err?: any) => (err ? reject(err) : resolve()),
          ),
        ),
      ).to.be.rejectedWith(error);
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
        (multer as any)(applyDefaultLimits(options)).none()(
          req as any,
          {} as any,
          (err?: any) => (err ? reject(err) : resolve((req as any).body)),
        ),
      );
    };

    /** `count` distinct field names. */
    const names = (count: number) =>
      Array.from({ length: count }, (_, i) => `f${i}`);

    it('should reject more than 1000 parts by default', async () => {
      expect(Object.keys(await parseFields({}, names(1000)))).to.have.lengthOf(
        1000,
      );
      await expect(parseFields({}, names(1001)))
        .to.be.rejected.and.eventually.have.property('code')
        .that.equals('LIMIT_PART_COUNT');
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
          (multer as any)(applyDefaultLimits({})).any()(
            req as any,
            {} as any,
            (err?: any) => (err ? reject(err) : resolve()),
          ),
        ),
      )
        .to.be.rejected.and.eventually.have.property('code')
        .that.equals('LIMIT_PART_COUNT');
    });

    it('should apply the parts limit that is set', async () => {
      await expect(parseFields({ limits: { parts: 2 } }, names(3)))
        .to.be.rejected.and.eventually.have.property('code')
        .that.equals('LIMIT_PART_COUNT');
      const body = await parseFields(
        { limits: { parts: Infinity } },
        names(1001),
      );
      expect(Object.keys(body)).to.have.lengthOf(1001);
    });

    it('should apply the default to the limits a function returns', async () => {
      await expect(parseFields({ limits: (() => ({})) as any }, names(1001)))
        .to.be.rejected.and.eventually.have.property('code')
        .that.equals('LIMIT_PART_COUNT');
    });
  });
});

describe('runMulter', () => {
  const response = () => new Writable({ write: (_chunk, _enc, cb) => cb() });
  const tick = () => new Promise(resolve => setImmediate(resolve));

  it('should settle with what multer calls back with', async () => {
    expect(await runMulter((_req, _res, next) => next(), {}, response())).to.be
      .undefined;
    const error = new (multer as any).MulterError('LIMIT_FILE_SIZE', 'f');
    await expect(
      runMulter((_req, _res, next) => next(error), {}, response()),
    ).to.be.rejectedWith(PayloadTooLargeException);
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
    await expect(result).to.be.rejectedWith('Request closed');
    expect(req.destroyed).to.be.true;
  });

  it('should leave a request whose body has been received', async () => {
    const req = Object.assign(new PassThrough(), { complete: true });
    const res = response();
    let next!: (err?: any) => void;
    const result = runMulter((_req, _res, n) => (next = n), req, res);
    res.end();
    await tick();
    expect(req.destroyed).to.be.false;
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
    expect(req.body.tags).to.deep.equal(['a', 'b']);
    expect(req.body.user.ids).to.deep.equal(['7']);
  });

  it('should close the gaps that array indexes leave, with multer', async () => {
    const boundary = 'nestjs';
    const body =
      [
        ['tags[3]', 'b'],
        ['tags[1]', 'a'],
        ['user[ids][1000]', '7'],
      ]
        .map(
          ([name, value]) =>
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
            `${value}\r\n`,
        )
        .join('') + `--${boundary}--\r\n`;
    const req: any = Object.assign(Readable.from([Buffer.from(body)]), {
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(Buffer.byteLength(body)),
      },
    });
    await runMulter((multer as any)().none(), req, response());
    expect(req.body.tags).to.deep.equal(['a', 'b']);
    expect(req.body.user.ids).to.deep.equal(['7']);
  });

  it('should leave a body multer did not parse', async () => {
    const tags = ['a'];
    tags[3] = 'b';
    const req: any = { body: { tags } };
    await runMulter((_req, _res, next) => next(), req, response());
    expect(req.body.tags).to.have.lengthOf(4);
  });

  it('should stop watching the response once multer is done', async () => {
    const req = new PassThrough();
    const res = response();
    await runMulter((_req, _res, next) => next(), req, res);
    res.end();
    await tick();
    expect(req.destroyed).to.be.false;
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
    expect(store).to.deep.equal({
      outer: ['first', { list: ['z'] }],
      dense: ['a', 'b'],
      text: 'x',
    });
  });

  it('should keep arrays without gaps as they are', () => {
    const dense = ['a', 'b'];
    const store = { dense };
    closeArrayGaps(store);
    expect(store.dense).to.equal(dense);
    expect(dense).to.deep.equal(['a', 'b']);
  });
});

describe('removeFilesOnPipeRejection', () => {
  const error = new BadRequestException('Validation failed');
  const createStorage = () => ({
    _removeFile: sinon.stub().callsFake((_req, _file, cb) => cb(null)),
  });
  const createResponse = () =>
    new Writable({ write: (_chunk, _encoding, cb) => cb() });
  const fail = async (storage: any, req: any, res: Writable) => {
    try {
      await lastValueFrom(
        throwError(() => error).pipe(
          removeFilesOnPipeRejection(storage, req, res),
        ),
      );
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.equal(error);
    }
  };

  (
    [
      ['req.file', (file: object) => ({ file })],
      ['req.files', (file: object) => ({ files: [file] })],
      ['req.files by field', (file: object) => ({ files: { docs: [file] } })],
    ] as const
  ).forEach(([location, createRequest]) => {
    it(`should remove ${location} once the response is sent when the pipes rejected the request`, async () => {
      const storage = createStorage();
      const file = { fieldname: 'docs', path: '/uploads/a' };
      const req = createRequest(file);
      const res = createResponse();
      markRejectedByPipes(req);

      await fail(storage, req, res);
      // An exception filter may still use the files until the response is out.
      expect(storage._removeFile.called).to.be.false;
      res.end();
      await new Promise(resolve => setImmediate(resolve));

      expect(storage._removeFile.calledWith(req, file, sinon.match.func)).to.be
        .true;
    });
  });

  it('should keep the files when the route handler failed', async () => {
    const storage = createStorage();
    const req = { file: { fieldname: 'doc', path: '/uploads/a' } };
    const res = createResponse();

    await fail(storage, req, res);
    res.end();
    await new Promise(resolve => setImmediate(resolve));

    expect(storage._removeFile.called).to.be.false;
  });

  describe('when the request was pipelined on a connection', () => {
    // The response of a request that waits behind others pipelined on the
    // connection: it has no socket of its own, and may never close itself
    const createConnection = () =>
      Object.assign(new EventEmitter(), { destroyed: false });
    const createPipelinedExchange = (connection: EventEmitter) => {
      const file = { fieldname: 'doc', path: '/uploads/a' };
      const req = { file, socket: connection };
      const res = Object.assign(createResponse(), { req });
      markRejectedByPipes(req);
      return { file, req, res };
    };
    const removed = async (storage: ReturnType<typeof createStorage>) => {
      for (let i = 0; i < 10 && !storage._removeFile.called; i++) {
        await new Promise(resolve => setImmediate(resolve));
      }
    };

    it('should remove the files when the connection closes before the response is sent', async () => {
      const storage = createStorage();
      const connection = createConnection();
      const { file, req, res } = createPipelinedExchange(connection);

      await fail(storage, req, res);
      expect(storage._removeFile.called).to.be.false;
      connection.emit('close');

      await removed(storage);
      expect(storage._removeFile.calledOnce).to.be.true;
      expect(storage._removeFile.calledWith(req, file, sinon.match.func)).to.be
        .true;
    });

    it('should remove the files once when the response is sent before the connection closes', async () => {
      const storage = createStorage();
      const connection = createConnection();
      const { req, res } = createPipelinedExchange(connection);

      await fail(storage, req, res);
      res.end();
      await removed(storage);
      connection.emit('close');
      await new Promise(resolve => setImmediate(resolve));

      expect(storage._removeFile.calledOnce).to.be.true;
    });
  });
});

describe('transformException', () => {
  describe('if error does not exist', () => {
    it('should behave as identity', () => {
      const err = undefined;
      expect(transformException(err)).to.be.eq(err);
    });
  });
  describe('if error is instance of HttpException', () => {
    it('should behave as identity', () => {
      const err = new HttpException('response', 500);
      expect(transformException(err)).to.be.eq(err);
    });
  });
  describe('if error exists and is not instance of HttpException', () => {
    describe('and is LIMIT_FILE_SIZE exception', () => {
      it('should return "PayloadTooLargeException"', () => {
        const err = { message: multerExceptions.LIMIT_FILE_SIZE };
        expect(transformException(err as any)).to.be.instanceof(
          PayloadTooLargeException,
        );
      });
    });
    describe('and is multer exception but not a LIMIT_FILE_SIZE', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_KEY };
        expect(transformException(err as any)).to.be.instanceof(
          BadRequestException,
        );
      });
      it('should return "BadRequestException" for LIMIT_FIELD_NESTING', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_NESTING };
        expect(transformException(err as any)).to.be.instanceof(
          BadRequestException,
        );
      });
      it('should append the field property to the message', () => {
        const err = {
          message: multerExceptions.LIMIT_FIELD_NESTING,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).to.equal(
          `${multerExceptions.LIMIT_FIELD_NESTING} - foo`,
        );
      });
    });
    describe('and is busboy/multipart exception', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND };
        expect(transformException(err as any)).to.be.instanceof(
          BadRequestException,
        );
      });

      it('should return "BadRequestException"', () => {
        const err = {
          message: busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
        };
        expect(transformException(err as any)).to.be.instanceof(
          BadRequestException,
        );
      });
    });
    describe('and is an error thrown by multer', () => {
      it('should return "BadRequestException" for LIMIT_UNEXPECTED_FILE', () => {
        const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo');
        const result = transformException(err);
        expect(result).to.be.instanceOf(BadRequestException);
        expect(result!.message).to.equal(`${err.message} - photo`);
      });
      it('should return "PayloadTooLargeException" for LIMIT_FILE_SIZE', () => {
        const err = new multer.MulterError('LIMIT_FILE_SIZE', 'avatar');
        expect(transformException(err)).to.be.instanceOf(
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
        expect(result).to.be.instanceOf(BadRequestException);
        expect(result!.message).to.equal('Some other wording - photo');
      });
      it('should return "BadRequestException" for LIMIT_FIELD_ARRAY_INDEX', () => {
        const err = new multer.MulterError(
          'LIMIT_FIELD_ARRAY_INDEX',
          'tags[99]',
        );
        const result = transformException(err);
        expect(result).to.be.instanceOf(BadRequestException);
        expect(result!.message).to.equal(`${err.message} - tags[99]`);
      });
      it('should return "BadRequestException" for INVALID_FIELD_NAME', () => {
        const err = new multer.MulterError('INVALID_FIELD_NAME', 'a[b]');
        const result = transformException(err);
        expect(result).to.be.instanceOf(BadRequestException);
        expect(result!.message).to.equal(`${err.message} - a[b]`);
      });
      it('should behave as identity for STREAM_DESTROYED', () => {
        // raised by disk storage after the stream was destroyed, not by the
        // client, so it stays a 500
        const err = new multer.MulterError('STREAM_DESTROYED', 'avatar');
        expect(transformException(err)).to.equal(err);
      });
      it('should behave as identity for a code that is not a multer code', () => {
        const err = Object.assign(new Error('no such file'), {
          code: 'ENOENT',
        });
        expect(transformException(err)).to.equal(err);
      });
    });
    describe(`and has a 'field' property`, () => {
      it('should return the field propery appended to the error message', () => {
        const err = {
          message: multerExceptions.LIMIT_UNEXPECTED_FILE,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).to.equal(
          `${multerExceptions.LIMIT_UNEXPECTED_FILE} - foo`,
        );
      });
    });
  });
});
