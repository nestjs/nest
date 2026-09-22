import {
  BadRequestException,
  type CallHandler,
  PayloadTooLargeException,
  StreamableFile,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import { lastValueFrom, of, throwError } from 'rxjs';
import { FileStreamInterceptor } from '../../../multipart/interceptors/file-stream.interceptor.js';
import {
  createContext,
  createFakeRequest,
  field,
  file,
} from '../fake-request.js';

describe('FileStreamInterceptor', () => {
  const handler: CallHandler = { handle: () => of('test') };
  const createReply = () => ({ raw: new EventEmitter() });

  it('should return metatype with expected structure', () => {
    const targetClass = FileStreamInterceptor('file');
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });

  it('should hand the handler the stream, with the preceding fields in req.body', async () => {
    const target = new (FileStreamInterceptor('upload'))();
    const req = createFakeRequest([
      field('purpose', 'backup'),
      file('upload', 'streamed', 'blob.bin'),
      field('ignored', 'x'),
    ]);
    await target.intercept(createContext(req, createReply()), handler);

    expect(req.body).toEqual({ purpose: 'backup' });
    expect(req.file).toMatchObject({
      fieldname: 'upload',
      originalname: 'blob.bin',
    });
    const chunks: Buffer[] = [];
    for await (const chunk of req.file.stream) {
      chunks.push(chunk);
    }
    expect(Buffer.concat(chunks).toString()).toBe('streamed');
  });

  it('should leave req.files undefined', async () => {
    const target = new (FileStreamInterceptor('upload'))();
    const req = createFakeRequest([file('upload')]);
    await target.intercept(createContext(req, createReply()), handler);
    expect(Object.hasOwn(req, 'files')).toBe(true);
    expect(req.files).toBeUndefined();
  });

  it('should fail the stream when the file is over fileSize before it is handed over', async () => {
    // busboy parses as much of the part as the chunk at hand holds before
    // the part reaches the interceptor, so the limit may have been hit
    // already, and 'limit' will not fire again.
    const target = new (FileStreamInterceptor('upload', {
      limits: { fileSize: 4 },
    }))();
    const req = createFakeRequest([
      { ...file('upload', '0123'), truncated: true },
    ]);
    await target.intercept(createContext(req, createReply()), handler);

    await expect(async () => {
      for await (const _ of req.file.stream) {
        // consume
      }
    }).rejects.toEqual(new PayloadTooLargeException('File too large'));
  });

  it('should fail the stream once the file goes over fileSize', async () => {
    const target = new (FileStreamInterceptor('upload', {
      limits: { fileSize: 4 },
    }))();
    const req = createFakeRequest([file('upload', '0123')]);
    await target.intercept(createContext(req, createReply()), handler);

    req.file.stream.emit('limit');
    await expect(async () => {
      for await (const _ of req.file.stream) {
        // consume
      }
    }).rejects.toEqual(new PayloadTooLargeException('File too large'));
  });

  it('should reject a file in another field', async () => {
    const target = new (FileStreamInterceptor('upload'))();
    const req = createFakeRequest([file('other')]);
    await expect(
      target.intercept(createContext(req, createReply()), handler),
    ).rejects.toEqual(new BadRequestException('Unexpected file field - other'));
  });

  describe('when the handler leaves the stream unread', () => {
    it('should discard the rest of the body before responding', async () => {
      const target = new (FileStreamInterceptor('upload'))();
      const req = createFakeRequest([file('upload')]);
      const result$ = await target.intercept(
        createContext(req, createReply()),
        handler,
      );

      expect(req.raw.unpipe).not.toHaveBeenCalled();
      expect(await lastValueFrom(result$)).toBe('test');
      expect(req.raw.unpipe).toHaveBeenCalled();
      expect(req.raw.readableEnded).toBe(true);
    });

    it('should discard the rest of the body before rethrowing handler errors', async () => {
      const target = new (FileStreamInterceptor('upload'))();
      const req = createFakeRequest([file('upload')]);
      const error = new Error('handler failed');
      const result$ = await target.intercept(
        createContext(req, createReply()),
        { handle: () => throwError(() => error) },
      );

      await expect(lastValueFrom(result$)).rejects.toBe(error);
      expect(req.raw.unpipe).toHaveBeenCalled();
    });

    it('should not wait for the body before responding with a StreamableFile', async () => {
      const target = new (FileStreamInterceptor('upload'))();
      const req = createFakeRequest([file('upload')]);
      const reply = createReply();
      const streamable = new StreamableFile(Buffer.from('x'));
      const result$ = await target.intercept(createContext(req, reply), {
        handle: () => of(streamable),
      });

      expect(await lastValueFrom(result$)).toBe(streamable);
      expect(req.raw.unpipe).not.toHaveBeenCalled();
      reply.raw.emit('close');
      expect(req.raw.unpipe).toHaveBeenCalled();
    });
  });
});
