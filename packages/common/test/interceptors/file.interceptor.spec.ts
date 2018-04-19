import * as sinon from 'sinon';
import { expect } from 'chai';
import { FileInterceptor } from './../../interceptors/file.interceptor';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';

describe('FileInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileInterceptor('file');
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe('intercept', () => {
    let stream$;
    beforeEach(() => {
      stream$ = of('test');
    });
    it('should call single() with expected params', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName))();
      const callback = (req, res, next) => next();
      const singleSpy = sinon
        .stub((target as any).upload, 'single')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), stream$);

      expect(singleSpy.called).to.be.true;
      expect(singleSpy.calledWith(fieldName)).to.be.true;
    });
    it('should transform exception', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName));
      const err = {};
      const callback = (req, res, next) => next(err);

      (target as any).upload = {
        single: () => callback,
      };
      expect(target.intercept(new ExecutionContextHost([]), stream$)).to.eventually.throw();
    });
  });
});
