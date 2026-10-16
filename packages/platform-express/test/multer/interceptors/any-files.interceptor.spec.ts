import { BadRequestException, CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes';
import { expect } from 'chai';
import { lastValueFrom, of, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { Writable } from 'stream';
import { AnyFilesInterceptor } from '../../../multer/interceptors/any-files.interceptor';

describe('FilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = AnyFilesInterceptor();
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe('intercept', () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
    });
    it('should call any() with expected params', async () => {
      const target = new (AnyFilesInterceptor())();

      const callback = (req, res, next) => next();
      const arraySpy = sinon
        .stub((target as any).multer, 'any')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith()).to.be.true;
    });
    it('should transform exception', async () => {
      const target = new (AnyFilesInterceptor())();
      const err = {};
      const callback = (req, res, next) => next(err);
      (target as any).multer = {
        any: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        error => expect(error).to.not.be.undefined,
      );
    });
    it('should remove the stored files when the pipes reject the request', async () => {
      const file = { fieldname: 'file' };
      const storage = {
        _removeFile: sinon.stub().callsFake((_req, _file, cb) => cb(null)),
      };
      const target = new (AnyFilesInterceptor())();
      (target as any).multer = {
        any: () => (req, _res, next) => {
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
      try {
        await lastValueFrom(result$);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.equal(error);
      }
      res.end();
      await new Promise(resolve => setImmediate(resolve));

      expect(storage._removeFile.calledWith(req, file, sinon.match.func)).to.be
        .true;
    });
  });
});
