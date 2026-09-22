import { BadRequestException, type CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { FilesInterceptor } from '../../../multipart/interceptors/files.interceptor.js';
import { createContext, createFakeRequest, file } from '../fake-request.js';

describe('FilesInterceptor', () => {
  const handler: CallHandler = { handle: () => of('test') };

  it('should return metatype with expected structure', () => {
    const targetClass = FilesInterceptor('file');
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });

  it('should populate req.files with an array', async () => {
    const target = new (FilesInterceptor('docs', 2))();
    const req = createFakeRequest([file('docs', 'one'), file('docs', 'two')]);
    await target.intercept(createContext(req), handler);

    expect(req.files.map((f: any) => f.buffer.toString())).toEqual([
      'one',
      'two',
    ]);
    expect(req.file).toBeUndefined();
  });

  it('should reject files over maxCount and remove the stored ones', async () => {
    const storage = {
      _handleFile: vi.fn((_req, incoming, cb) => {
        incoming.stream.resume();
        incoming.stream.once('end', () => cb(null, { size: 1 }));
      }),
      _removeFile: vi.fn((_req, _file, cb) => cb(null)),
    };
    const target = new (FilesInterceptor('docs', 1, { storage }))();
    const req = createFakeRequest([file('docs'), file('docs')]);

    await expect(target.intercept(createContext(req), handler)).rejects.toEqual(
      new BadRequestException('Unexpected file field - docs'),
    );
    expect(storage._removeFile).toHaveBeenCalledTimes(1);
    expect(req.raw.unpipe).toHaveBeenCalled();
  });
});
