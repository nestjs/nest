import { BadRequestException, CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { FileInterceptor } from '../../../multer/interceptors/file.interceptor';

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
    it('should return error if throwsOnNotFound is set to true and file is not present', async () => {
      const fieldName = 'file';
      const newFieldName = 'definetelynotwhatyouexpect';
      const target = new (FileInterceptor(fieldName, {
        throwsOnNotFound: true,
      }))();
      const callback = (req, res, next) => {
        req.file = { newFieldName: fieldName };
        next();
      };
      const singleSpy = sinon
        .stub((target as any).multer, 'single')
        .returns(callback);
      const request = { body: {} };
      await expect(
        target.intercept(new ExecutionContextHost([request]), handler),
      ).to.be.rejectedWith(BadRequestException);

      expect(singleSpy.called).to.be.true;
      expect(singleSpy.calledWith(fieldName)).to.be.true;
    });
    it('should not return error if throwsOnNotFound is set to true and file is present', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName, {
        throwsOnNotFound: true,
      }))();
      const callback = (req, res, next) => {
        req.file = { fieldname: fieldName };
        next();
      };
      const singleSpy = sinon
        .stub((target as any).multer, 'single')
        .returns(callback);
      const request = { body: {} };
      await expect(
        target.intercept(new ExecutionContextHost([request]), handler),
      ).to.not.be.rejectedWith(BadRequestException);

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
  });
});
