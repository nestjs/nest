import { BadRequestException, CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { markRejectedByPipes } from '@nestjs/core/router/rejected-by-pipes';
import { expect } from 'chai';
import { lastValueFrom, of, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { Writable } from 'stream';
import { FileFieldsInterceptor } from '../../../multer/interceptors/file-fields.interceptor';

describe('FileFieldsInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'anotherFile', maxCount: 1 },
    ]);
    expect(targetClass.prototype.intercept).to.not.be.undefined;
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
      const fieldsSpy = sinon
        .stub((target as any).multer, 'fields')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(fieldsSpy.called).to.be.true;
      expect(fieldsSpy.calledWith(argument)).to.be.true;
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
        error => expect(error).to.not.be.undefined,
      );
    });
    it('should remove the stored files when the pipes reject the request', async () => {
      const file = { fieldname: 'file' };
      const storage = {
        _removeFile: sinon.stub().callsFake((_req, _file, cb) => cb(null)),
      };
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
