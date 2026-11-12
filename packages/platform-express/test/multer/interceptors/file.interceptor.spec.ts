import { BadRequestException, CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { lastValueFrom, of, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { PassThrough, Writable } from 'stream';
import { FileInterceptor } from '../../../multer/interceptors/file.interceptor';

chai.use(chaiAsPromised);

describe('FileInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileInterceptor('file');
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe('intercept', () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
    });
    it('should call single() with expected params', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName))();
      const callback = (req, res, next) => next();
      const singleSpy = sinon
        .stub((target as any).multer, 'single')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(singleSpy.called).to.be.true;
      expect(singleSpy.calledWith(fieldName)).to.be.true;
    });
    it('should transform exception', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName))();
      const err = {};
      const callback = (req, res, next) => next(err);
      (target as any).multer = {
        single: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        error => expect(error).to.not.be.undefined,
      );
    });
    it('should destroy the request when the response is sent while the upload is received', async () => {
      const target = new (FileInterceptor('file'))();
      (target as any).multer = {
        single: () => (r, _res, next) =>
          r.once('close', () => next(new Error('Request closed'))),
      };
      const req = new PassThrough();
      const res = new Writable({ write: (_chunk, _encoding, cb) => cb() });

      const result = target.intercept(
        new ExecutionContextHost([req, res]),
        handler,
      );
      // e.g. a timeout interceptor bound earlier answers meanwhile
      res.end();

      await expect(result).to.be.rejectedWith('Request closed');
      expect(req.destroyed).to.be.true;
    });
    it('should remove the stored file when the pipes reject the request', async () => {
      const file = { fieldname: 'file' };
      const storage = {
        _removeFile: sinon.stub().callsFake((_req, _file, cb) => cb(null)),
      };
      const target = new (FileInterceptor('file'))();
      (target as any).multer = {
        single: () => (req, _res, next) => {
          req.file = file;
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
  it('should set the default parts limit', () => {
    const target = new (FileInterceptor('file', {
      limits: { fileSize: 10 },
    }))();
    expect((target as any).multer.limits).to.deep.equal({
      fileSize: 10,
      parts: 1000,
    });
  });
  it('should keep the module limits a route sets to undefined', () => {
    const target = new (FileInterceptor('file', { limits: undefined }))({
      limits: { fileSize: 1024 },
    });
    expect((target as any).multer.limits).to.deep.equal({
      fileSize: 1024,
      parts: 1000,
    });
  });
});
