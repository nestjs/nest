import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';
import { readEvents, readTicks, resetState } from '../src/app.controller';
import {
  getJson,
  requestAndAbort,
  sleep,
  startRequest,
  waitFor,
} from './utils';

describe('Observable response lifecycle (Fastify Application)', () => {
  let app: INestApplication;
  let port: number;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
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
    expect(ticksAtClose).to.be.greaterThan(0);

    await sleep(200);
    expect(readTicks()).to.equal(ticksAtClose);
  });

  it('still replies normally when the Observable completes', async () => {
    expect(await getJson(port, '/final')).to.deep.equal({ ok: true });
  });

  it('stops an intercepted producer Observable once the client disconnects', async () => {
    await requestAndAbort(port, '/observable-intercepted', 100);

    const ticksAtClose = readTicks();
    expect(ticksAtClose).to.be.greaterThan(0);

    await sleep(200);
    expect(readTicks()).to.equal(ticksAtClose);
  });

  it('still replies normally when an intercepted Observable completes', async () => {
    expect(await getJson(port, '/final-intercepted')).to.deep.equal({
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
    expect(readEvents()).to.deep.equal([
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
    expect(readEvents()).to.deep.equal([
      'handler-start',
      'filter:late failure',
    ]);
  });
});
