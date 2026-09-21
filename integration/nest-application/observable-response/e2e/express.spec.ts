import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { readTicks, resetTicks } from '../src/app.controller.js';
import { getJson, requestAndAbort, sleep } from './utils.js';

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
    resetTicks();
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
});
