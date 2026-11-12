import {
  BadRequestException,
  type CallHandler,
  PayloadTooLargeException,
} from '@nestjs/common';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes.js';
import { lastValueFrom, of, throwError } from 'rxjs';
import { EventEmitter, once } from 'events';
import { Readable, Writable } from 'stream';
import { FileInterceptor } from '../../../multipart/interceptors/file.interceptor.js';
import { MISSING_PLUGIN_MESSAGE } from '../../../multipart/multipart/multipart.constants.js';
import {
  createContext,
  createFakeRequest,
  field,
  file,
} from '../fake-request.js';

describe('FileInterceptor', () => {
  let handler: CallHandler;
  beforeEach(() => {
    handler = { handle: () => of('test') };
  });

  it('should return metatype with expected structure', () => {
    const targetClass = FileInterceptor('file');
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });

  describe('intercept', () => {
    it('should populate req.file and req.body', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([
        field('name', 'Ada'),
        file('avatar', 'hello', 'a.txt'),
      ]);
      await target.intercept(createContext(req), handler);

      expect(req.body).toEqual({ name: 'Ada' });
      expect(req.file).toEqual({
        fieldname: 'avatar',
        originalname: 'a.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        buffer: Buffer.from('hello'),
        size: 5,
      });
    });

    it('should decode escaped characters in the file name, as multer does', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([file('avatar', 'x', 'a%22b%0Ac%0D.txt')]);
      await target.intercept(createContext(req), handler);
      expect(req.file.originalname).toBe('a"b\nc\r.txt');
    });

    it('should leave req.files undefined', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([file('avatar')]);
      await target.intercept(createContext(req), handler);
      expect(Object.hasOwn(req, 'files')).toBe(true);
      expect(req.files).toBeUndefined();
    });

    it('should pass non-multipart requests through', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([], { multipart: false });
      req.body = { json: true };
      await target.intercept(createContext(req), handler);

      expect(req.parts).not.toHaveBeenCalled();
      expect(req.body).toEqual({ json: true });
      expect(Object.hasOwn(req, 'file')).toBe(true);
      expect(req.file).toBeUndefined();
    });

    it('should ignore a file part without a file name', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([file('avatar', '', '')]);
      await target.intercept(createContext(req), handler);
      expect(req.file).toBeUndefined();
    });

    it('should reject a second file', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([file('avatar'), file('avatar')]);
      await expect(
        target.intercept(createContext(req), handler),
      ).rejects.toEqual(
        new BadRequestException('Unexpected file field - avatar'),
      );
    });

    it('should reject a truncated file with a 413', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([{ ...file('avatar'), truncated: true }]);
      await expect(
        target.intercept(createContext(req), handler),
      ).rejects.toEqual(new PayloadTooLargeException('File too large'));
    });

    it('should fail with an actionable message when the plugin is missing', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([], { plugin: false });
      await expect(
        target.intercept(createContext(req), handler),
      ).rejects.toThrow(MISSING_PLUGIN_MESSAGE);
    });
  });

  describe('options', () => {
    it('should merge global and local limits key-by-key', async () => {
      const target = new (FileInterceptor('avatar', {
        limits: { fileSize: 10 },
      }))({ limits: { files: 2 } });
      const req = createFakeRequest([]);
      await target.intercept(createContext(req), handler);

      expect(req.parts).toHaveBeenCalledWith({
        throwFileSizeLimit: false,
        limits: { files: 2, fileSize: 10 },
      });
    });

    it('should leave limits set to null or undefined to the plugin', async () => {
      // @fastify/multipart deep-merges these limits over its own, where an
      // undefined `fileSize` would replace its default with no limit at all.
      const target = new (FileInterceptor('avatar', {
        limits: { fileSize: undefined, parts: null!, files: 2 },
      }))();
      const req = createFakeRequest([]);
      await target.intercept(createContext(req), handler);

      expect(req.parts.mock.calls[0][0]).toStrictEqual({
        throwFileSizeLimit: false,
        limits: { files: 2 },
      });
    });

    it('should resolve limits given as a function of the request', async () => {
      const limits = vi.fn(() => ({ fileSize: 3 }));
      const target = new (FileInterceptor('avatar', { limits }))();
      const req = createFakeRequest([]);
      await target.intercept(createContext(req), handler);

      expect(limits).toHaveBeenCalledWith(req);
      expect(req.parts).toHaveBeenCalledWith({
        throwFileSizeLimit: false,
        limits: { fileSize: 3 },
      });
    });

    it('should reject invalid limits returned by a function, after reading the body', async () => {
      const target = new (FileInterceptor('avatar', {
        limits: () => ({ fileSize: -1 }),
      }))();
      const req = createFakeRequest([file('avatar')]);
      await expect(
        target.intercept(createContext(req), handler),
      ).rejects.toThrow(
        'Expected limits.fileSize to be a non-negative integer or Infinity',
      );
      expect(req.raw.unpipe).toHaveBeenCalled();
    });

    it('should pass preservePath and defParamCharset to the parser', async () => {
      const target = new (FileInterceptor('avatar', {
        preservePath: true,
        defParamCharset: 'utf8',
      }))();
      const req = createFakeRequest([]);
      await target.intercept(createContext(req), handler);

      expect(req.parts).toHaveBeenCalledWith({
        throwFileSizeLimit: false,
        preservePath: true,
        defParamCharset: 'utf8',
      });
    });

    it('should skip files rejected by fileFilter', async () => {
      const target = new (FileInterceptor('avatar', {
        fileFilter: (_req, _file, cb) => cb(null, false),
      }))();
      const req = createFakeRequest([file('avatar')]);
      await target.intercept(createContext(req), handler);
      expect(req.file).toBeUndefined();
    });

    it('should propagate fileFilter errors', async () => {
      const error = new BadRequestException('nope');
      const target = new (FileInterceptor('avatar', {
        fileFilter: (_req, _file, cb) => cb(error, false),
      }))();
      const req = createFakeRequest([file('avatar')]);
      await expect(target.intercept(createContext(req), handler)).rejects.toBe(
        error,
      );
    });

    it('should destroy the request when the response is sent while the body is being received', async () => {
      const storage = {
        _handleFile: (_req: any, incoming: any, cb: any) =>
          incoming.stream
            .on('end', () => cb(null, { path: 'stored' }))
            .resume(),
        _removeFile: vi.fn((_req, _file, cb) => cb(null)),
      };
      const target = new (FileInterceptor('avatar', { storage }))();
      const req = createFakeRequest([]);
      const stream = Readable.from([Buffer.from('x')]);
      stream.on('error', () => undefined);
      req.parts = () =>
        (async function* () {
          yield {
            type: 'file',
            fieldname: 'avatar',
            filename: 'a.txt',
            encoding: '7bit',
            mimetype: 'text/plain',
            file: stream,
          };
          // As @fastify/multipart does when a request that was not read to
          // its end is closed.
          await once(req.raw, 'close');
          throw Object.assign(new Error('the request was closed'), {
            code: 'FST_MP_PREMATURE_CLOSE',
          });
        })();
      const response = new Writable({ write: (_chunk, _enc, cb) => cb() });
      const result = target.intercept(
        createContext(req, { raw: response }),
        handler,
      );
      await vi.waitFor(() => expect(stream.readableEnded).toBe(true));
      response.end();

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      expect(req.raw.destroyed).toBe(true);
      expect(storage._removeFile).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ path: 'stored' }),
        expect.any(Function),
      );
    });

    it('should leave the request once the body has been parsed', async () => {
      const target = new (FileInterceptor('avatar'))();
      const req = createFakeRequest([file('avatar')]);
      const response = new Writable({ write: (_chunk, _enc, cb) => cb() });
      await target.intercept(createContext(req, { raw: response }), handler);
      response.end();
      await new Promise(resolve => setImmediate(resolve));
      expect(req.raw.destroyed).toBe(false);
    });

    it('should fail the request with what fileFilter throws', async () => {
      const error = new BadRequestException('nope');
      const target = new (FileInterceptor('avatar', {
        fileFilter: () => {
          throw error;
        },
      }))();
      const req = createFakeRequest([file('avatar')]);
      await expect(target.intercept(createContext(req), handler)).rejects.toBe(
        error,
      );
    });

    it('should fail the request with what an async fileFilter rejects with', async () => {
      const error = new BadRequestException('nope');
      const target = new (FileInterceptor('avatar', {
        fileFilter: (async () => {
          throw error;
        }) as any,
      }))();
      const req = createFakeRequest([file('avatar')]);
      await expect(target.intercept(createContext(req), handler)).rejects.toBe(
        error,
      );
    });

    it('should report the error of a storage engine that destroyed the stream', async () => {
      const error = new Error('EACCES');
      const storage = {
        _handleFile: vi.fn((_req, incoming, cb) => {
          // As pipeline() does when the destination fails.
          incoming.stream.destroy(error);
          incoming.stream.once('close', () => setImmediate(() => cb(error)));
        }),
        _removeFile: vi.fn(),
      };
      const target = new (FileInterceptor('avatar', { storage }))();
      const req = createFakeRequest([file('avatar')]);
      await expect(target.intercept(createContext(req), handler)).rejects.toBe(
        error,
      );
    });

    describe.each([
      ['without an error', false],
      ['with the error the parts iterator fails with', true],
    ])(
      'when the client disconnects while a file is being stored (stream destroyed %s)',
      (_, abortedWithError) => {
        const aborted = { ...file('avatar'), aborted: true, abortedWithError };

        it('should remove the partial file the storage engine reports a path for', async () => {
          const storage = {
            _handleFile: vi.fn((_req, incoming, cb) => {
              incoming.path = '/uploads/partial';
              incoming.stream.resume();
              incoming.stream.once('close', () =>
                setImmediate(() => cb(new Error('premature close'))),
              );
            }),
            _removeFile: vi.fn((_req, _file, cb) => cb(null)),
          };
          const target = new (FileInterceptor('avatar', { storage }))();
          const req = createFakeRequest([aborted]);

          await expect(
            target.intercept(createContext(req), handler),
          ).rejects.toEqual(new BadRequestException('the request was closed'));
          await vi.waitFor(() =>
            expect(storage._removeFile).toHaveBeenCalledWith(
              req,
              expect.objectContaining({ path: '/uploads/partial' }),
              expect.any(Function),
            ),
          );
        });

        it('should remove a file the storage engine stores anyway', async () => {
          const storage = {
            _handleFile: vi.fn((_req, incoming, cb) => {
              incoming.stream.resume();
              incoming.stream.once('close', () =>
                setImmediate(() => cb(null, { key: 'bucket/object' })),
              );
            }),
            _removeFile: vi.fn((_req, _file, cb) => cb(null)),
          };
          const target = new (FileInterceptor('avatar', { storage }))();
          const req = createFakeRequest([aborted]);

          await expect(
            target.intercept(createContext(req), handler),
          ).rejects.toBeInstanceOf(BadRequestException);
          await vi.waitFor(() =>
            expect(storage._removeFile).toHaveBeenCalledWith(
              req,
              expect.objectContaining({ key: 'bucket/object' }),
              expect.any(Function),
            ),
          );
        });

        it('should remove the partial file right away, as the storage engine may never call back', async () => {
          // e.g. an engine waiting on pipeline(), which never settles for a
          // stream destroyed after its last chunk was pushed
          const storage = {
            _handleFile: vi.fn((_req, incoming) => {
              incoming.path = '/uploads/partial';
              incoming.stream.resume();
            }),
            _removeFile: vi.fn((_req, _file, cb) => cb(null)),
          };
          const target = new (FileInterceptor('avatar', { storage }))();
          const req = createFakeRequest([aborted]);

          await expect(
            target.intercept(createContext(req), handler),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(storage._removeFile).toHaveBeenCalledWith(
            req,
            expect.objectContaining({ path: '/uploads/partial' }),
            expect.any(Function),
          );
        });

        it('should not wait for a storage engine that never calls back', async () => {
          const storage = {
            _handleFile: vi.fn((_req, incoming) => incoming.stream.resume()),
            _removeFile: vi.fn(),
          };
          const target = new (FileInterceptor('avatar', { storage }))();
          const req = createFakeRequest([aborted]);

          await expect(
            target.intercept(createContext(req), handler),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(storage._removeFile).not.toHaveBeenCalled();
        });
      },
    );

    it('should remove the file at path when the storage engine fails', async () => {
      const error = new Error('ENOSPC');
      const storage = {
        _handleFile: vi.fn((_req, incoming, cb) => {
          incoming.path = '/uploads/partial';
          incoming.stream.resume();
          incoming.stream.once('end', () => cb(error));
        }),
        _removeFile: vi.fn((_req, _file, cb) => cb(null)),
      };
      const target = new (FileInterceptor('avatar', { storage }))();
      const req = createFakeRequest([file('avatar')]);
      await expect(target.intercept(createContext(req), handler)).rejects.toBe(
        error,
      );
      expect(storage._removeFile).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ path: '/uploads/partial' }),
        expect.any(Function),
      );
    });

    describe('when the parser destroys the stream with an error queued behind other parts (@fastify/multipart >= 10.1.7)', () => {
      const premature = () =>
        Object.assign(new Error('the request was closed'), {
          code: 'FST_MP_PREMATURE_CLOSE',
        });
      /**
       * A form cut off while `avatar` is stored: the parser destroys its
       * stream with `streamError`, and the parts iterator fails with
       * `iteratorError` after the parts in `queued`.
       */
      const createCutOffRequest = (
        streamError: Error,
        iteratorError: Error,
        queued: object[],
      ) => {
        const req = createFakeRequest([]);
        const stream = new Readable({ read() {} });
        stream.push('partial');
        stream.on('error', () => undefined);
        req.parts = () =>
          (async function* () {
            yield {
              type: 'file',
              fieldname: 'avatar',
              filename: 'a.txt',
              encoding: '7bit',
              mimetype: 'text/plain',
              file: stream,
            };
            yield* queued;
            throw iteratorError;
          })();
        setImmediate(() => stream.destroy(streamError));
        return req;
      };
      const title = {
        type: 'field',
        fieldname: 'title',
        value: 'x',
        mimetype: 'text/plain',
        encoding: '7bit',
        fieldnameTruncated: false,
        valueTruncated: false,
      };
      // An engine that only pipes the stream: it never calls back for a
      // stream destroyed mid-way.
      const createPipingStorage = () => ({
        _handleFile: vi.fn((_req, incoming) => {
          incoming.path = '/uploads/partial';
          incoming.stream.resume();
        }),
        _removeFile: vi.fn((_req, _file, cb) => cb(null)),
      });

      it('should find the error behind a field queued before it', async () => {
        const storage = createPipingStorage();
        const target = new (FileInterceptor('avatar', { storage }))();
        const error = premature();
        const req = createCutOffRequest(error, error, [title, title]);

        await expect(
          target.intercept(createContext(req), handler),
        ).rejects.toEqual(new BadRequestException('the request was closed'));
        expect(storage._removeFile).toHaveBeenCalledWith(
          req,
          expect.objectContaining({ path: '/uploads/partial' }),
          expect.any(Function),
        );
      });

      it('should fail with another error the iterator fails with', async () => {
        const storage = createPipingStorage();
        const target = new (FileInterceptor('avatar', { storage }))();
        const limit = Object.assign(new Error('reach files limit'), {
          code: 'FST_FILES_LIMIT',
        });
        const req = createCutOffRequest(premature(), limit, []);

        await expect(
          target.intercept(createContext(req), handler),
        ).rejects.toEqual(new BadRequestException('Too many files'));
        expect(storage._removeFile).toHaveBeenCalledWith(
          req,
          expect.objectContaining({ path: '/uploads/partial' }),
          expect.any(Function),
        );
      });
    });

    describe('when the parser never finishes the form', () => {
      it('should remove the stored files once the client disconnects', async () => {
        const storage = {
          _handleFile: vi.fn((_req, incoming, cb) =>
            incoming.stream
              .on('end', () => cb(null, { path: '/uploads/a' }))
              .resume(),
          ),
          _removeFile: vi.fn((_req, _file, cb) => cb(null)),
        };
        const target = new (FileInterceptor('avatar', { storage }))();
        const req = createFakeRequest([]);
        const socket = new EventEmitter();
        req.raw.socket = socket;
        const stream = Readable.from([Buffer.from('x')]);
        stream.on('error', () => undefined);
        req.parts = () =>
          (async function* () {
            yield {
              type: 'file',
              fieldname: 'avatar',
              filename: 'a.txt',
              encoding: '7bit',
              mimetype: 'text/plain',
              file: stream,
            };
            // A part whose headers never end: busboy never emits it.
            await new Promise(() => undefined);
          })();
        const result = target.intercept(createContext(req), handler);
        await vi.waitFor(() => expect(storage._handleFile).toHaveBeenCalled());
        await new Promise(resolve => setImmediate(resolve));
        expect(storage._removeFile).not.toHaveBeenCalled();

        socket.emit('close');
        await expect(result).rejects.toEqual(
          new BadRequestException('Multipart: Unexpected end of form'),
        );
        expect(storage._removeFile).toHaveBeenCalledWith(
          req,
          expect.objectContaining({ path: '/uploads/a' }),
          expect.any(Function),
        );
      });

      it('should stop watching the connection once the form is parsed', async () => {
        const target = new (FileInterceptor('avatar'))();
        const req = createFakeRequest([file('avatar')]);
        const socket = new EventEmitter();
        req.raw.socket = socket;
        await target.intercept(createContext(req), handler);
        expect(socket.listenerCount('close')).toBe(0);
      });
    });

    it('should use the storage engine from the options', async () => {
      const storage = {
        _handleFile: vi.fn((_req, incoming, cb) => {
          incoming.stream.resume();
          incoming.stream.once('end', () => cb(null, { size: 42 }));
        }),
        _removeFile: vi.fn(),
      };
      const target = new (FileInterceptor('avatar', { storage }))();
      const req = createFakeRequest([file('avatar')]);
      await target.intercept(createContext(req), handler);

      expect(storage._handleFile).toHaveBeenCalled();
      expect(req.file.size).toBe(42);
    });
  });

  describe('when the route handler does not run', () => {
    const error = new BadRequestException('Validation failed');
    const failing: CallHandler = { handle: () => throwError(() => error) };
    const createStorage = () => ({
      _handleFile: vi.fn((_req, incoming, cb) => {
        incoming.stream.resume();
        incoming.stream.once('end', () => cb(null, { path: '/uploads/a' }));
      }),
      _removeFile: vi.fn((_req, _file, cb) => cb(null)),
    });
    const createReply = () => ({
      raw: new Writable({ write: (_chunk, _encoding, cb) => cb() }),
    });

    it('should remove the stored file once the response is sent when the pipes rejected the request', async () => {
      const storage = createStorage();
      const target = new (FileInterceptor('avatar', { storage }))();
      const req = createFakeRequest([file('avatar')]);
      const reply = createReply();
      markRejectedByPipes(req);

      const result$ = await target.intercept(
        createContext(req, reply),
        failing,
      );
      await expect(lastValueFrom(result$)).rejects.toBe(error);
      // An exception filter may still use the file until the response is out.
      expect(storage._removeFile).not.toHaveBeenCalled();
      reply.raw.end();

      await vi.waitFor(() =>
        expect(storage._removeFile).toHaveBeenCalledWith(
          req,
          expect.objectContaining({ path: '/uploads/a' }),
          expect.any(Function),
        ),
      );
    });

    it('should remove the stored file of a request marked under the registered symbol', async () => {
      const storage = createStorage();
      const target = new (FileInterceptor('avatar', { storage }))();
      const req = createFakeRequest([file('avatar')]);
      const reply = createReply();
      req[Symbol.for('nestjs:rejected-by-pipes')] = true;

      const result$ = await target.intercept(
        createContext(req, reply),
        failing,
      );
      await expect(lastValueFrom(result$)).rejects.toBe(error);
      reply.raw.end();

      await vi.waitFor(() =>
        expect(storage._removeFile).toHaveBeenCalledWith(
          req,
          expect.objectContaining({ path: '/uploads/a' }),
          expect.any(Function),
        ),
      );
    });

    it('should keep the stored file when the route handler fails', async () => {
      const storage = createStorage();
      const target = new (FileInterceptor('avatar', { storage }))();
      const req = createFakeRequest([file('avatar')]);
      const reply = createReply();

      const result$ = await target.intercept(
        createContext(req, reply),
        failing,
      );
      await expect(lastValueFrom(result$)).rejects.toBe(error);
      reply.raw.end();
      await new Promise(resolve => setImmediate(resolve));

      expect(storage._removeFile).not.toHaveBeenCalled();
    });
  });
});
