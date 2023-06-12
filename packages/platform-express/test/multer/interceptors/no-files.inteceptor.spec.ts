import { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { NoFilesInterceptor } from '../../../multer/interceptors/no-files.interceptor';

describe('NoFilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = NoFilesInterceptor();
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe('intercept', () => {
    let handler: CallHandler;
    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
    });
    it('should call none() with expected params', async () => {
      const target = new (NoFilesInterceptor())();

      const callback = (req, res, next) => next();
      const noneSpy = sinon
        .stub((target as any).multer, 'none')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(noneSpy.called).to.be.true;
    });
    it('should transform exception', async () => {
      const target = new (NoFilesInterceptor())();
      const err = {};
      const callback = (req, res, next) => next(err);
      (target as any).multer = {
        none: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        error => expect(error).to.not.be.undefined,
      );
    });
  });
});
