import { Readable } from 'stream';
import { memoryStorage } from '../../../multipart/storage/memory.storage.js';

const incoming = (content: string) =>
  ({
    fieldname: 'f',
    originalname: 'a.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    stream: Readable.from([Buffer.from(content)]),
  }) as any;

describe('memoryStorage', () => {
  it('should buffer the file', async () => {
    const info = await new Promise<any>((resolve, reject) =>
      memoryStorage()._handleFile({}, incoming('hello'), (err, result) =>
        err ? reject(err) : resolve(result),
      ),
    );
    expect(info).toEqual({ buffer: Buffer.from('hello'), size: 5 });
  });

  it('should report stream errors', async () => {
    const file = incoming('');
    file.stream = new Readable({
      read() {
        this.destroy(new Error('boom'));
      },
    });
    await expect(
      new Promise((resolve, reject) =>
        memoryStorage()._handleFile({}, file, (err, info) =>
          err ? reject(err) : resolve(info),
        ),
      ),
    ).rejects.toThrow('boom');
  });

  it('should drop the buffer on removal', async () => {
    const file: any = { buffer: Buffer.from('x') };
    await new Promise(resolve =>
      memoryStorage()._removeFile({}, file, resolve),
    );
    expect(file.buffer).toBeUndefined();
  });
});
