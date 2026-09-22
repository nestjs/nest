import type { CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { AnyFilesInterceptor } from '../../../multipart/interceptors/any-files.interceptor.js';
import { createContext, createFakeRequest, file } from '../fake-request.js';

describe('AnyFilesInterceptor', () => {
  const handler: CallHandler = { handle: () => of('test') };

  it('should return metatype with expected structure', () => {
    const targetClass = AnyFilesInterceptor();
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });

  it('should accept files in any field', async () => {
    const target = new (AnyFilesInterceptor())();
    const req = createFakeRequest([file('x'), file('y'), file('x')]);
    await target.intercept(createContext(req), handler);
    expect(req.files.map((f: any) => f.fieldname)).toEqual(['x', 'y', 'x']);
  });
});
