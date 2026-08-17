import { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { of } from 'rxjs';
import { FileFieldsInterceptor } from '../../../multer/interceptors/file-fields.interceptor.js';

describe('FileFieldsInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'anotherFile', maxCount: 1 },
    ]);
    expect(targetClass.prototype.intercept).not.toBeUndefined();
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
      const fieldsSpy = vi
        .spyOn((target as any).multer, 'fields')
        .mockReturnValue(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(fieldsSpy).toHaveBeenCalled();
      expect(fieldsSpy).toHaveBeenCalledWith(argument);
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
        error => expect(error).not.toBeUndefined(),
      );
    });
  });
});
