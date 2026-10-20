import { BadRequestException, CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes.js';
import { lastValueFrom, of, throwError } from 'rxjs';
import { Writable } from 'stream';
import { FileFieldsInterceptor } from '../../../multer/interceptors/file-fields.interceptor.js';

describe('FileFieldsInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'anotherFile', maxCount: 1 },
    ]);
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });
  describe('intercept', () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
    });
    it('should call object with expected params', async () => {
      const fieldName1 = 'file';
      const maxCount1 = 1;
      const fieldName2 = 'anotherFile';
      const maxCount2 = 2;
      const argument = [
        { name: fieldName1, maxCount: maxCount1 },
        { name: fieldName2, maxCount: maxCount2 },
      ];
      const target = new (FileFieldsInterceptor(argument))();

      const callback = (req, res, next) => next();
      const fieldsSpy = vi
        .spyOn((target as any).multer, 'fields')
        .mockReturnValue(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(fieldsSpy).toHaveBeenCalled();
      expect(fieldsSpy).toHaveBeenCalledWith(argument);
    });
    it('should transform exception', async () => {
      const fieldName1 = 'file';
      const maxCount1 = 1;
      const fieldName2 = 'anotherFile';
      const maxCount2 = 2;
      const argument = [
        { name: fieldName1, maxCount: maxCount1 },
        { name: fieldName2, maxCount: maxCount2 },
      ];
      const target = new (FileFieldsInterceptor(argument))();
      const err = {};
      const callback = (req, res, next) => next(err);
      (target as any).fields = {
        array: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        error => expect(error).not.toBeUndefined(),
      );
    });
    it('should remove the stored files when the pipes reject the request', async () => {
      const file = { fieldname: 'file' };
      const storage = { _removeFile: vi.fn((_req, _file, cb) => cb(null)) };
      const target = new (FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
      ]))();
      (target as any).multer = {
        fields: () => (req, _res, next) => {
          req.files = { file: [file] };
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
    const target = new (FileFieldsInterceptor([{ name: 'file', maxCount: 1 }], {
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
