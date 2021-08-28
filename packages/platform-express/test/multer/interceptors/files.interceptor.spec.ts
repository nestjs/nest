import { BadRequestException, CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { FilesInterceptor } from '../../../multer/interceptors/files.interceptor';

describe('FilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FilesInterceptor('file');
    expect(targetClass.prototype.intercept).to.not.be.undefined;
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
      const target = new (FilesInterceptor(fieldName, undefined, maxCount))();

      const callback = (req, res, next) => next();
      const arraySpy = sinon
        .stub((target as any).multer, 'array')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith(fieldName, maxCount)).to.be.true;
    });
    it('should return error if throwsOnNotFound is set to true and file is not present', async () => {
      const fieldName = 'file';
      const maxCount = 10;
      const newFieldName = 'definetelynotwhatyouexpect';
      const target = new (FilesInterceptor(
        fieldName,
        { throwsOnNotFound: true },
        maxCount,
      ))();
      const callback = (req, res, next) => {
        req.files = [];
        next();
      };
      const arraySpy = sinon
        .stub((target as any).multer, 'array')
        .returns(callback);
      const request = { body: {} };
      await expect(
        target.intercept(new ExecutionContextHost([request]), handler),
      ).to.be.rejectedWith(BadRequestException);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith(fieldName, maxCount)).to.be.true;
    });
    it('should not return error if throwsOnNotFound is set to true and file is present', async () => {
      const maxCount = 10;
      const fieldName = 'file';
      const target = new (FilesInterceptor(
        fieldName,
        { throwsOnNotFound: true },
        maxCount,
      ))();
      const callback = (req, res, next) => {
        const file = {
          fieldname: fieldName,
          originalname: 'temp.gif',
          encoding: '7bit',
          mimetype: 'image/gif',
          buffer: {
            type: 'Buffer',
            data: [],
          },
          size: 0,
        };
        req.files = [file, file];
        next();
      };
      const arraySpy = sinon
        .stub((target as any).multer, 'array')
        .returns(callback);
      const request = { body: {} };
      await expect(
        target.intercept(new ExecutionContextHost([request]), handler),
      ).to.not.be.rejectedWith(BadRequestException);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith(fieldName, maxCount)).to.be.true;
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
        error => expect(error).to.not.be.undefined,
      );
    });
  });
});
