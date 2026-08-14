import { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { of } from 'rxjs';
import { NoFilesInterceptor } from '../../../multer/interceptors/no-files.interceptor.js';

describe('NoFilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = NoFilesInterceptor();
    expect(targetClass.prototype.intercept).not.toBeUndefined();
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
      const noneSpy = vi
        .spyOn((target as any).multer, 'none')
        .mockReturnValue(callback);

      await target.intercept(new ExecutionContextHost([]), handler);

      expect(noneSpy).toHaveBeenCalled();
    });
    it('should transform exception', async () => {
      const target = new (NoFilesInterceptor())();
      const err = {};
      const callback = (req, res, next) => next(err);
      (target as any).multer = {
        none: () => callback,
      };
      (target.intercept(new ExecutionContextHost([]), handler) as any).catch(
        error => expect(error).not.toBeUndefined(),
      );
    });
  });
});
