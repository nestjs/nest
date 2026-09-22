import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { readEvents, readTicks, resetState } from '../src/app.controller.js';
import {
  getJson,
  requestAndAbort,
  sleep,
  startRequest,
  waitFor,
} from './utils.js';

describe('Observable response lifecycle (Express Application)', () => {
  let app: INestApplication;
  let port: number;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0, '127.0.0.1');
    port = Number(new URL(await app.getUrl()).port);
    resetState();
  });

  afterEach(async () => {
    await app.close();
  });

  it('stops the producer Observable once the client disconnects', async () => {
    await requestAndAbort(port, '/observable', 100);

    const ticksAtClose = readTicks();
    expect(ticksAtClose).toBeGreaterThan(0);

    await sleep(200);
    expect(readTicks()).toBe(ticksAtClose);
  });

  it('still replies normally when the Observable completes', async () => {
    await expect(getJson(port, '/final')).resolves.toEqual({ ok: true });
  });

  it('stops an intercepted producer Observable once the client disconnects', async () => {
    await requestAndAbort(port, '/observable-intercepted', 100);

    const ticksAtClose = readTicks();
    expect(ticksAtClose).toBeGreaterThan(0);

    await sleep(200);
    expect(readTicks()).toBe(ticksAtClose);
  });

  it('still replies normally when an intercepted Observable completes', async () => {
    await expect(getJson(port, '/final-intercepted')).resolves.toEqual({
      value: 3,
    });
  });

  it('lets interceptors finish after a disconnect when the handler returns no Observable', async () => {
    const abort = startRequest(port, '/slow-intercepted');
    await waitFor(() => readEvents().includes('handler-start'));
    abort();

    await waitFor(
      () =>
        readEvents().includes('handler-done') &&
        readEvents().includes('finalize'),
    );
    expect(readEvents()).toEqual([
      'handler-start',
      'handler-done',
      'commit',
      'finalize',
    ]);
  });

  it('routes a late error to the exception filters after a disconnect when the handler returns no Observable', async () => {
    const abort = startRequest(port, '/slow-intercepted-error');
    await waitFor(() => readEvents().includes('handler-start'));
    abort();

    await waitFor(() => readEvents().includes('filter:late failure'));
    expect(readEvents()).toEqual(['handler-start', 'filter:late failure']);
  });
});
