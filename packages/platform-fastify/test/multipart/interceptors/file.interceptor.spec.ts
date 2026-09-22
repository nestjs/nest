import {
  BadRequestException,
  type CallHandler,
  PayloadTooLargeException,
} from '@nestjs/common';
import { of } from 'rxjs';
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

    describe('when the client disconnects while a file is being stored', () => {
      const aborted = { ...file('avatar'), aborted: true };

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
});
