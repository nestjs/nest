import { BadRequestException, type CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { FileFieldsInterceptor } from '../../../multipart/interceptors/file-fields.interceptor.js';
import { createContext, createFakeRequest, file } from '../fake-request.js';

describe('FileFieldsInterceptor', () => {
  const handler: CallHandler = { handle: () => of('test') };
  const fields = [
    { name: 'avatar', maxCount: 1 },
    { name: 'background', maxCount: 2 },
  ];

  it('should return metatype with expected structure', () => {
    const targetClass = FileFieldsInterceptor(fields);
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });

  it('should group req.files by field, in arrival order', async () => {
    const target = new (FileFieldsInterceptor(fields))();
    const req = createFakeRequest([
      file('background', 'b1'),
      file('avatar', 'a'),
      file('background', 'b2'),
    ]);
    await target.intercept(createContext(req), handler);

    expect(Object.keys(req.files)).toEqual(['background', 'avatar']);
    expect(req.files.background).toHaveLength(2);
    expect(req.files.avatar[0].buffer.toString()).toBe('a');
  });

  it('should reject a field over its maxCount', async () => {
    const target = new (FileFieldsInterceptor(fields))();
    const req = createFakeRequest([file('avatar'), file('avatar')]);
    await expect(target.intercept(createContext(req), handler)).rejects.toEqual(
      new BadRequestException('Unexpected file field - avatar'),
    );
  });
});
