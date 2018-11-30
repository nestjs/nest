import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { FilesInterceptor } from '../../../files/interceptors/files.interceptor';
import { CallHandler } from '../../../interfaces/features/nest-interceptor.interface';

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
      const target = new (FilesInterceptor(fieldName, maxCount))();

      const callback = (req, res, next) => next();
      const arraySpy = sinon
        .stub((target as any).upload, 'array')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith(fieldName, maxCount)).to.be.true;
    });
    it('should transform exception', async () => {
      const fieldName = 'file';
      const target = new (FilesInterceptor(fieldName))();
      const err = {};
      const callback = (req, res, next) => next(err);

      (target as any).upload = {
        array: () => callback,
      };
      expect(
        target.intercept(new ExecutionContextHost([]), handler),
      ).to.eventually.throw();
    });
  });
});
