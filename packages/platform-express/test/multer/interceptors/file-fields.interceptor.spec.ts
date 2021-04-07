import { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';

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
  });
});
