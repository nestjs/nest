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

  const intercept = (target: any, fieldname: string) => {
    const req = createFakeRequest([field(fieldname, 'x')]);
    return target.intercept(createContext(req), handler).then(() => req.body);
  };

  it('should reject names nested deeper than fieldNestingDepth', async () => {
    const target = new (NoFilesInterceptor({
      limits: { fieldNestingDepth: 1 },
    }))();
    expect(await intercept(target, 'a[b]')).toEqual({ a: { b: 'x' } });
    await expect(intercept(target, 'a[b][c]')).rejects.toEqual(
      new BadRequestException('Field name nesting too deep - a[b][c]'),
    );
  });

  it('should reject any nesting when fieldNestingDepth is 0', async () => {
    const target = new (NoFilesInterceptor({
      limits: { fieldNestingDepth: 0 },
    }))();
    expect(await intercept(target, 'a')).toEqual({ a: 'x' });
    await expect(intercept(target, 'a[b]')).rejects.toEqual(
      new BadRequestException('Field name nesting too deep - a[b]'),
    );
    await expect(intercept(target, 'a[]')).rejects.toEqual(
      new BadRequestException('Field name nesting too deep - a[]'),
    );
  });

  it('should reject array indexes over fieldArrayIndexLimit', async () => {
    const target = new (NoFilesInterceptor({
      limits: { fieldArrayIndexLimit: 2 },
    }))();
    expect(await intercept(target, 'a[2]')).toEqual({
      a: [undefined, undefined, 'x'],
    });
    for (const name of ['a[3]', 'a[b][3]', 'a[3][b]', 'a[0][3]', 'a[3][]']) {
      await expect(intercept(target, name)).rejects.toEqual(
        new BadRequestException(`Field name array index too large - ${name}`),
      );
    }
  });

  it('should reject any index but 0 when fieldArrayIndexLimit is 0', async () => {
    const target = new (NoFilesInterceptor({
      limits: { fieldArrayIndexLimit: 0 },
    }))();
    expect(await intercept(target, 'a[0]')).toEqual({ a: ['x'] });
    await expect(intercept(target, 'a[1]')).rejects.toEqual(
      new BadRequestException('Field name array index too large - a[1]'),
    );
  });

  it('should not apply fieldArrayIndexLimit to a name kept as a literal key', async () => {
    const target = new (NoFilesInterceptor({
      limits: { fieldArrayIndexLimit: 2 },
    }))();
    for (const name of ['a[3]x', '[3]', 'a[][3]']) {
      expect(await intercept(target, name)).toEqual({ [name]: 'x' });
    }
  });

  it('should leave nesting and array indexes unlimited by default', async () => {
    const name = 'a[b][c][d][7]';
    const expected = { a: { b: { c: { d: new Array(7).concat('x') } } } };
    expect(await intercept(new (NoFilesInterceptor())(), name)).toEqual(
      expected,
    );
    expect(
      await intercept(
        new (NoFilesInterceptor({
          limits: {
            fieldNestingDepth: Infinity,
            fieldArrayIndexLimit: Infinity,
          },
        }))(),
        name,
      ),
    ).toEqual(expected);
  });

  it("should check the field name limits in multer's order", async () => {
    const target = new (NoFilesInterceptor({
      limits: {
        fieldNameSize: 10,
        fieldNestingDepth: 1,
        fieldArrayIndexLimit: 2,
      },
    }))();
    // Too long, too deep and over the index limit: the size is reported.
    await expect(intercept(target, 'a[b][c][9]x')).rejects.toEqual(
      new BadRequestException('Field name too long'),
    );
    // Too deep and over the index limit: the depth is reported.
    await expect(intercept(target, 'a[b][9]')).rejects.toEqual(
      new BadRequestException('Field name nesting too deep - a[b][9]'),
    );
    // The depth and the index are checked on the decoded name.
    await expect(intercept(target, 'a%22[9]')).rejects.toEqual(
      new BadRequestException('Field name array index too large - a"[9]'),
    );
  });

  it('should apply field name limits resolved per request', async () => {
    const target = new (NoFilesInterceptor({
      limits: () => ({ fieldNestingDepth: 0, fieldArrayIndexLimit: 0 }),
    }))();
    await expect(intercept(target, 'a[b]')).rejects.toEqual(
      new BadRequestException('Field name nesting too deep - a[b]'),
    );
  });

  it('should reject field name limits that are not a non-negative integer', () => {
    for (const limits of [
      { fieldNestingDepth: -1 },
      { fieldNestingDepth: 1.5 },
      { fieldArrayIndexLimit: -1 },
      { fieldArrayIndexLimit: NaN },
    ]) {
      expect(() => new (NoFilesInterceptor({ limits }))()).toThrow(TypeError);
    }
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
