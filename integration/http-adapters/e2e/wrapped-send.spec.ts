import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import {
  sentBodies,
  WrappedSendModule,
} from '../src/wrapped-send/wrapped-send.module.js';

// Middleware written for Express wraps res.send() or res.json() to log the
// body or to reshape it, and sees every reply, since the Express adapter
// replies through them
describe.each(adapters('express', 'node'))(
  'Replies through a res.send() or res.json() a middleware wrapped (%s)',
  name => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(name, WrappedSendModule);
    });

    beforeEach(() => {
      sentBodies.length = 0;
    });

    afterAll(async () => {
      await app.close();
    });

    it('should send the body the wrapped res.json() reshaped', async () => {
      const res = await request(app.getHttpServer()).get('/wrapped/object');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: { hello: 'world' } });
      expect(sentBodies).toEqual(['{"data":{"hello":"world"}}']);
    });

    it('should hand a text body to the wrapped res.send()', async () => {
      const res = await request(app.getHttpServer()).get('/wrapped/text');

      expect(res.text).toBe('plain');
      expect(sentBodies).toEqual(['plain']);
    });

    it('should hand the body of an exception to them as well', async () => {
      const res = await request(app.getHttpServer()).get('/wrapped/missing');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        data: { message: 'Missing', error: 'Not Found', statusCode: 404 },
      });
    });

    it('should hand an empty reply to the wrapped res.send()', async () => {
      const res = await request(app.getHttpServer()).delete('/wrapped/item');

      expect(res.status).toBe(204);
      expect(sentBodies).toEqual([undefined]);
    });
  },
);
