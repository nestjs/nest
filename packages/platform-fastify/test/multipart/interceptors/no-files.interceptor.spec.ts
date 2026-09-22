import { BadRequestException, type CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { NoFilesInterceptor } from '../../../multipart/interceptors/no-files.interceptor.js';
import {
  createContext,
  createFakeRequest,
  field,
  file,
} from '../fake-request.js';

describe('NoFilesInterceptor', () => {
  const handler: CallHandler = { handle: () => of('test') };

  it('should return metatype with expected structure', () => {
    const targetClass = NoFilesInterceptor();
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });

  it('should populate req.body with bracket notation', async () => {
    const target = new (NoFilesInterceptor())();
    const req = createFakeRequest([
      field('user[name]', 'Ada'),
      field('tags[]', 'a'),
      field('tags[]', 'b'),
      field('a%22b', '1'),
    ]);
    await target.intercept(createContext(req), handler);
    expect(req.body).toEqual({
      user: { name: 'Ada' },
      tags: ['a', 'b'],
      'a"b': '1',
    });
    expect(req.file).toBeUndefined();
    expect(req.files).toBeUndefined();
  });

  it('should reject any file', async () => {
    const target = new (NoFilesInterceptor())();
    const req = createFakeRequest([file('avatar')]);
    await expect(target.intercept(createContext(req), handler)).rejects.toEqual(
      new BadRequestException('Unexpected file field - avatar'),
    );
  });

  it('should reject truncated values and oversized names', async () => {
    const target = new (NoFilesInterceptor({
      limits: { fieldNameSize: 3 },
    }))();
    await expect(
      target.intercept(
        createContext(
          createFakeRequest([{ ...field('a', 'x'), valueTruncated: true }]),
        ),
        handler,
      ),
    ).rejects.toEqual(new BadRequestException('Field value too long - a'));
    await expect(
      target.intercept(
        createContext(createFakeRequest([field('abcd', 'x')])),
        handler,
      ),
    ).rejects.toEqual(new BadRequestException('Field name too long'));
  });

  it("should check text fields in multer's order", async () => {
    const target = new (NoFilesInterceptor({
      limits: { fieldNameSize: 3 },
    }))();
    // A value too long is reported before a name too long.
    await expect(
      target.intercept(
        createContext(
          createFakeRequest([{ ...field('abcd', 'x'), valueTruncated: true }]),
        ),
        handler,
      ),
    ).rejects.toEqual(new BadRequestException('Field value too long - abcd'));
    // The size limit applies to the name as it arrived, before decoding.
    await expect(
      target.intercept(
        createContext(createFakeRequest([field('a%22', 'x')])),
        handler,
      ),
    ).rejects.toEqual(new BadRequestException('Field name too long'));
  });

  it('should reject parts without a name, even an empty file input', async () => {
    const target = new (NoFilesInterceptor())();
    const nameless = { ...file('x', '', ''), fieldname: undefined as any };
    await expect(
      target.intercept(createContext(createFakeRequest([nameless])), handler),
    ).rejects.toEqual(new BadRequestException('Field name missing'));
  });

  it('should reject names that would pollute a prototype', async () => {
    const target = new (NoFilesInterceptor())();
    const req = createFakeRequest([field('__proto__[x]', '1')]);
    await expect(target.intercept(createContext(req), handler)).rejects.toEqual(
      new BadRequestException('Invalid field name - __proto__[x]'),
    );
    expect(({} as any).x).toBeUndefined();
  });
});
