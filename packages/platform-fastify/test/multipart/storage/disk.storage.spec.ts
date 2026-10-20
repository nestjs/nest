import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { diskStorage } from '../../../multipart/storage/disk.storage.js';

const incoming = (stream: Readable) => {
  const file: any = {
    fieldname: 'f',
    originalname: 'a.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
  };
  Object.defineProperty(file, 'stream', { value: stream });
  return file;
};

const handle = (storage: ReturnType<typeof diskStorage>, file: any) =>
  new Promise<any>((resolve, reject) =>
    storage._handleFile({}, file, (err, info) =>
      err ? reject(err) : resolve(info),
    ),
  );

describe('diskStorage', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'nest-disk-storage-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('should create a string destination eagerly', () => {
    const destination = join(dir, 'nested', 'uploads');
    diskStorage({ destination });
    expect(existsSync(destination)).toBe(true);
  });

  it('should write the file under a random hex name', async () => {
    const file = incoming(Readable.from([Buffer.from('on disk')]));
    const info = await handle(diskStorage({ destination: dir }), file);

    expect(info.destination).toBe(dir);
    expect(info.filename).toMatch(/^[0-9a-f]{32}$/);
    expect(info.path).toBe(join(dir, info.filename));
    expect(info.size).toBe(7);
    expect(file.path).toBe(info.path);
    expect(readFileSync(info.path, 'utf8')).toBe('on disk');
  });

  it('should use destination and filename functions', async () => {
    const storage = diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => cb(null, `x-${file.originalname}`),
    });
    const info = await handle(
      storage,
      incoming(Readable.from([Buffer.from('x')])),
    );
    expect(info.path).toBe(join(dir, 'x-a.txt'));
  });

  it('should remove a partially written file when the stream fails', async () => {
    const stream = new Readable({
      read() {
        this.push('partial');
        this.destroy(new Error('boom'));
      },
    });
    const storage = diskStorage({
      destination: dir,
      filename: (_req, _file, cb) => cb(null, 'partial.txt'),
    });
    await expect(handle(storage, incoming(stream))).rejects.toThrow('boom');
    expect(existsSync(join(dir, 'partial.txt'))).toBe(false);
  });

  describe('when the stream is destroyed without an error', () => {
    // As @fastify/multipart does when the form is cut off, possibly after
    // the file's last chunk was pushed: pipeline() then waits for an 'end'
    // that never comes.
    const cutOff = () => {
      const stream = new Readable({ read() {} });
      stream.push('complete');
      stream.push(null);
      return stream;
    };

    it('should close and remove the file being written', async () => {
      const stream = cutOff();
      const pipe = stream.pipe.bind(stream);
      vi.spyOn(stream, 'pipe').mockImplementation((destination, options) => {
        const result = pipe(destination, options);
        stream.destroy();
        return result;
      });
      const storage = diskStorage({
        destination: dir,
        filename: (_req, _file, cb) => cb(null, 'cut.txt'),
      });

      await expect(handle(storage, incoming(stream))).rejects.toThrow(
        'File stream was destroyed',
      );
      expect(existsSync(join(dir, 'cut.txt'))).toBe(false);
    });

    it('should not create a file for a stream destroyed before it is written', async () => {
      const stream = cutOff();
      const storage = diskStorage({
        destination: dir,
        filename: (_req, _file, cb) => {
          stream.destroy();
          stream.once('close', () => cb(null, 'late.txt'));
        },
      });
      const file = incoming(stream);

      await expect(handle(storage, file)).rejects.toThrow(
        'File stream was destroyed',
      );
      expect(existsSync(join(dir, 'late.txt'))).toBe(false);
      expect(file.path).toBeUndefined();
    });
  });

  it('should delete the file and its disk fields on removal', async () => {
    const storage = diskStorage({ destination: dir });
    const file = incoming(Readable.from([Buffer.from('x')]));
    Object.assign(file, await handle(storage, file));
    const path = file.path;

    await new Promise<void>((resolve, reject) =>
      storage._removeFile({}, file, err => (err ? reject(err) : resolve())),
    );
    expect(existsSync(path)).toBe(false);
    expect(file.path).toBeUndefined();
    expect(file.destination).toBeUndefined();
    expect(file.filename).toBeUndefined();
  });
});
