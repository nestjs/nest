import { BadRequestException, CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { AnyFilesInterceptor } from '../../../multer/interceptors/any-files.interceptor';

describe('AnyFilesInterceptor', () => {
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
    it('should return error if throwsOnNotFound is set to true and file is not present', async () => {
      const fieldName = 'file';
      const target = new (AnyFilesInterceptor({ throwsOnNotFound: true }))();
      const callback = (req, res, next) => {
        next();
      };
      const arraySpy = sinon
        .stub((target as any).multer, 'any')
        .returns(callback);
      const request = { body: {} };
      await expect(
        target.intercept(new ExecutionContextHost([request]), handler),
      ).to.be.rejectedWith(BadRequestException);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith()).to.be.true;
    });
    it('should not return error if throwsOnNotFound is set to true and file is present', async () => {
      const fieldName = 'file';
      const target = new (AnyFilesInterceptor({ throwsOnNotFound: true }))();
      const callback = (req, res, next) => {
        req.files = [{ fieldname: fieldName }];
        next();
      };
      const arraySpy = sinon
        .stub((target as any).multer, 'any')
        .returns(callback);
      const request = { body: {} };
      await expect(
        target.intercept(new ExecutionContextHost([request]), handler),
      ).to.not.be.rejectedWith(BadRequestException);

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
  });
});
