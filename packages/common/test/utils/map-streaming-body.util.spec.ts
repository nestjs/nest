import { Readable } from 'stream';
import { mapStreamingBody } from '../../utils/map-streaming-body.util.js';

describe('mapStreamingBody', () => {
  const project = (value: unknown) => ({ mapped: value });

  it.each<[string, () => unknown]>([
    ['a Response', () => new Response('test')],
    [
      'a Readable that is not in object mode',
      () => Readable.from(['test'], { objectMode: false }),
    ],
    [
      'a ReadableStream that is locked',
      () => {
        const stream = ReadableStream.from([{ id: 1 }]);
        stream.getReader();
        return stream;
      },
    ],
  ])('should return %s as it is', (_, create) => {
    const body = create();

    expect(mapStreamingBody(body, project)).toBe(body);
  });

  it('should return a Readable that has been read as it is', async () => {
    const body = Readable.from([{ id: 1 }]);
    await body.toArray();

    expect(mapStreamingBody(body, project)).toBe(body);
  });

  describe.each<[string, (chunks: unknown[]) => any]>([
    ['a ReadableStream', chunks => ReadableStream.from(chunks)],
    ['a Readable in object mode', chunks => Readable.from(chunks)],
    [
      'an async generator',
      async function* (chunks) {
        yield* chunks;
      },
    ],
  ])('given %s', (_, create) => {
    it('should map what it yields, except strings and binary data', async () => {
      const bytes = [Buffer.from('a'), new Uint8Array(1), new ArrayBuffer(1)];
      const mapped = mapStreamingBody(
        create([{ id: 1 }, 'text', ...bytes]),
        async value => project(value),
      );

      const chunks: unknown[] = [];
      for await (const chunk of mapped) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([{ mapped: { id: 1 } }, 'text', ...bytes]);
    });

    it('should be its own iterator', async () => {
      const mapped = mapStreamingBody(create([{ id: 1 }]), project);

      expect(mapped[Symbol.asyncIterator]()).toBe(mapped);
      expect(await mapped.next()).toEqual({
        done: false,
        value: { mapped: { id: 1 } },
      });
      expect(await mapped.next()).toEqual({ done: true, value: undefined });
    });

    it('should not read from the body before it is read itself', async () => {
      const body = create([{ id: 1 }]);
      mapStreamingBody(body, project);
      await new Promise(resolve => setImmediate(resolve));

      expect(body.locked).not.toBe(true);
      expect(Readable.isDisturbed(body)).toBe(false);
    });

    it('should fail with what the projection fails with', async () => {
      const mapped = mapStreamingBody(create([{ id: 1 }]), () => {
        throw new Error('not serializable');
      });

      await expect(mapped.next()).rejects.toThrow('not serializable');
    });
  });

  it.each<[string, (onStop: () => void) => unknown]>([
    [
      'a ReadableStream',
      onStop =>
        new ReadableStream({
          pull: controller => controller.enqueue({ id: 1 }),
          cancel: onStop,
        }),
    ],
    [
      'a Readable in object mode',
      onStop => Readable.from([{ id: 1 }, { id: 2 }]).on('close', onStop),
    ],
    [
      'an async generator',
      async function* (onStop) {
        try {
          yield { id: 1 };
          yield { id: 2 };
        } finally {
          onStop();
        }
      },
    ],
  ])('should stop %s once the projection fails', async (_, create) => {
    const onStop = vi.fn();
    const mapped = mapStreamingBody(create(onStop), () => {
      throw new Error('not serializable');
    });

    await expect(mapped.next()).rejects.toThrow('not serializable');
    await new Promise(resolve => setImmediate(resolve));

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('should stop an async generator that has not started', async () => {
    let started = false;
    const mapped = mapStreamingBody(
      (async function* () {
        started = true;
        yield { id: 1 };
      })(),
      project,
    );

    expect(await mapped.return('done')).toEqual({ done: true, value: 'done' });
    expect(await mapped.next()).toEqual({ done: true, value: undefined });
    expect(started).toBe(false);
  });

  it('should stop a ReadableStream whose read in progress never settles', async () => {
    const cancel = vi.fn();
    const mapped = mapStreamingBody(
      new ReadableStream({ pull: () => new Promise(() => undefined), cancel }),
      project,
    );
    const pending = mapped.next();

    await mapped.return();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(await pending).toEqual({ done: true, value: undefined });
  });

  it('should stop a Readable whose read in progress never settles', async () => {
    const body = new Readable({ objectMode: true, read: () => undefined });
    const mapped = mapStreamingBody(body, project);
    const pending = mapped.next().catch((err: Error) => err);

    await mapped.return();

    expect(body.destroyed).toBe(true);
    await pending;
  });

  it('should hand an error to the body, and map what it yields in turn', async () => {
    const mapped = mapStreamingBody(
      (async function* () {
        try {
          yield { id: 1 };
        } catch {
          yield { id: 2 };
        }
      })(),
      project,
    );
    await mapped.next();

    expect(await mapped.throw(new Error('test'))).toEqual({
      done: false,
      value: { mapped: { id: 2 } },
    });
  });

  it('should fail with the error given to a body that cannot take one', async () => {
    const cancel = vi.fn();
    const error = new Error('test');
    const mapped = mapStreamingBody(new ReadableStream({ cancel }), project);

    await expect(mapped.throw(error)).rejects.toBe(error);
    expect(cancel).toHaveBeenCalledWith(error);
  });
});
