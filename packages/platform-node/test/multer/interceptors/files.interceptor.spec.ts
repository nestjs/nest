import {
  BadRequestException,
  CallHandler,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes.js';
import { lastValueFrom, of, throwError } from 'rxjs';
import { Writable } from 'stream';
import { FilesInterceptor } from '../../../multer/interceptors/files.interceptor.js';

describe('FilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FilesInterceptor('file');
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });
  describe('intercept', () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
    });
    it('should call array() with expected params', async () => {
      const fieldName = 'file';
      const maxCount = 10;
      const target = new (FilesInterceptor(fieldName, maxCount))();

      const callback = (req, res, next) => next();
      const arraySpy = vi
        .spyOn((target as any).multer, 'array')
        .mockReturnValue(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(arraySpy).toHaveBeenCalled();
      expect(arraySpy).toHaveBeenCalledWith(fieldName, maxCount);
    });
    it('should transform exception', async () => {
      const fieldName = 'file';
      const target = new (FilesInterceptor(fieldName))();
      const err = {};
      const callback = (req, res, next) => next(err);
      (target as any).multer = {
        array: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        error => expect(error).not.toBeUndefined(),
      );
    });
    it('should set the fileSize limit on a file too large exception', async () => {
      const target = new (FilesInterceptor('file', 2, {
        limits: { fileSize: 10 },
      }))();
      const err = { code: 'LIMIT_FILE_SIZE', message: 'File too large' };
      (target as any).multer = { array: () => (_req, _res, next) => next(err) };

      const error = await (
        target.intercept(new ExecutionContextHost([{}]), handler) as any
      ).catch(e => e);

      expect(error).toBeInstanceOf(PayloadTooLargeException);
      expect(error.limit).toBe(10);
    });
    it('should set the fileSize limit a limits function returned for the request', async () => {
      const target = new (FilesInterceptor('file', 2, {
        limits: (req: any) => ({ fileSize: req.maxSize }),
      }))();
      const err = { code: 'LIMIT_FILE_SIZE', message: 'File too large' };
      // multer calls the limits function once per request.
      (target as any).multer = {
        array: () => (req, _res, next) => {
          (target as any).options.limits(req);
          next(err);
        },
      };

      const error = await (
        target.intercept(
          new ExecutionContextHost([{ maxSize: 7 }]),
          handler,
        ) as any
      ).catch(e => e);

      expect(error).toBeInstanceOf(PayloadTooLargeException);
      expect(error.limit).toBe(7);
    });
    it('should remove the stored files when the pipes reject the request', async () => {
      const file = { fieldname: 'file' };
      const storage = { _removeFile: vi.fn((_req, _file, cb) => cb(null)) };
      const target = new (FilesInterceptor('file'))();
      (target as any).multer = {
        array: () => (req, _res, next) => {
          req.files = [file];
          next();
        },
        storage,
      };
      const req: any = {};
      const res = new Writable({ write: (_chunk, _encoding, cb) => cb() });
      const error = new BadRequestException('Validation failed');
      markRejectedByPipes(req);

      const result$ = await target.intercept(
        new ExecutionContextHost([req, res]),
        { handle: () => throwError(() => error) },
      );
      await expect(lastValueFrom(result$)).rejects.toBe(error);
      res.end();

      await vi.waitFor(() =>
        expect(storage._removeFile).toHaveBeenCalledWith(
          req,
          file,
          expect.any(Function),
        ),
      );
    });
  });
  it('should merge global and local limits key-by-key, over the default field name limits', () => {
    const target = new (FilesInterceptor('file', 10, {
      limits: { fileSize: 10 },
    }))({ limits: { files: 2 } });
    expect((target as any).multer.limits).toEqual({
      files: 2,
      fileSize: 10,
      fieldNestingDepth: 32,
      fieldArrayIndexLimit: 1000,
    });
  });
});
