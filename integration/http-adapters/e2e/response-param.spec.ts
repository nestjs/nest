import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { ResponseParamModule } from '../src/response-param/response-param.module.js';

// Well below the test timeout, so that a request that gets no answer fails
// its own test.
const deadline = 2_000;

describe.each(adapters('express', 'fastify', 'node'))(
  'Custom param decorators (%s)',
  name => {
    describe.each([
      { label: 'without a global pipe', withPipe: false },
      { label: 'with a global pipe', withPipe: true },
    ])('$label', ({ withPipe }) => {
      let app: INestApplication;

      beforeAll(async () => {
        app = await createApp(name, ResponseParamModule, app => {
          if (withPipe) {
            app.useGlobalPipes(
              new ValidationPipe({ validateCustomDecorators: true }),
            );
          }
        });
      });

      afterAll(async () => {
        await app.close();
      });

      it('should let the handler answer through the response a decorator gives it', async () => {
        const res = await request(app.getHttpServer())
          .get('/response')
          .timeout(deadline);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ same: true });
        expect(res.headers['x-from-param']).toBe('yes');
      });

      it('should run no pipe on the response a decorator gives', async () => {
        const res = await request(app.getHttpServer())
          .get('/response-with-pipe')
          .timeout(deadline);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ piped: false });
        expect(res.headers['x-from-param']).toBe('yes');
      });

      it('should give the handler what an async factory resolves to', async () => {
        const res = await request(app.getHttpServer())
          .get('/later?from=factory')
          .timeout(deadline);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ from: 'factory' });
      });

      if (withPipe) {
        it('should run the pipe on what an async factory resolves to', async () => {
          const res = await request(app.getHttpServer())
            .get('/later')
            .timeout(deadline);

          expect(res.status).toBe(400);
        });
      }
    });
  },
);
