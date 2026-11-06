import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { RequestRangeModule } from '../src/request-range/request-range.module.js';

describe.each(adapters('express', 'node'))('req.range() (%s)', name => {
  let app: INestApplication;
  const get = (range?: string, query = '') => {
    const req = request(app.getHttpServer()).get(`/range${query}`);
    return range === undefined ? req : req.set('range', range);
  };

  beforeAll(async () => {
    app = await createApp(name, RequestRangeModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should parse the Range header', async () => {
    const res = await get('bytes=0-99,-100');

    expect(res.body.ranges).toEqual([
      { start: 0, end: 99 },
      { start: 900, end: 999 },
    ]);
    expect(res.body.type).toBe('bytes');
  });

  it('should combine overlapping ranges when asked to', async () => {
    const res = await get('bytes=0-99,50-199', '?combine=true');

    expect(res.body.ranges).toEqual([{ start: 0, end: 199 }]);
  });

  it('should tell unsatisfiable and malformed headers apart', async () => {
    expect((await get('bytes=2000-3000')).body.ranges).toBe(-1);
    expect((await get('nope')).body.ranges).toBe(-2);
  });

  it('should return undefined without a Range header', async () => {
    expect((await get()).body.ranges).toBeNull();
  });
});
