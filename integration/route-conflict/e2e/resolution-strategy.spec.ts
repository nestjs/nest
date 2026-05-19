import { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MultiUserModule } from '../src/multi-user/multi-user.module.js';

async function buildApp(
  options: NestApplicationOptions,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [MultiUserModule],
  }).compile();
  return moduleRef.createNestApplication(options);
}

describe('Route resolution strategy: specificity (Express)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  describe('with the multi-user fixture', () => {
    beforeEach(async () => {
      app = await buildApp({ routeResolutionStrategy: 'specificity' });
      await app.init();
    });

    it('routes `/users/me` to the static handler, not `:userId`', async () => {
      const response = await request(app!.getHttpServer()).get('/users/me');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ handler: 'me' });
    });

    it('routes `/users/images` to the images handler, not `:userId`', async () => {
      const response = await request(app!.getHttpServer()).get('/users/images');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ handler: 'images' });
    });

    it('routes `/users/images/42` to the imageById handler', async () => {
      const response = await request(app!.getHttpServer()).get(
        '/users/images/42',
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ handler: 'imageById', imageId: '42' });
    });

    it('routes `/users/abc` to the byId handler with the userId param', async () => {
      const response = await request(app!.getHttpServer()).get('/users/abc');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ handler: 'byId', userId: 'abc' });
    });

    it('routes `/users/123` to the byId handler with the userId param', async () => {
      const response = await request(app!.getHttpServer()).get('/users/123');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ handler: 'byId', userId: '123' });
    });

    it('returns 404 for the controller root `/users` (no handler declared there)', async () => {
      const response = await request(app!.getHttpServer()).get('/users');
      expect(response.status).toBe(404);
    });

    it('returns 404 for paths deeper than any declared route', async () => {
      const response = await request(app!.getHttpServer()).get(
        '/users/me/details',
      );
      expect(response.status).toBe(404);
    });

    it('returns 404 for an unrelated path with the same prefix shape', async () => {
      const response = await request(app!.getHttpServer()).get('/admin/me');
      expect(response.status).toBe(404);
    });

    it('returns 404 for the root path', async () => {
      const response = await request(app!.getHttpServer()).get('/');
      expect(response.status).toBe(404);
    });

    it('returns 404 for a known path on the wrong HTTP method', async () => {
      const response = await request(app!.getHttpServer()).post('/users/me');
      expect(response.status).toBe(404);
    });
  });

  describe('combined with routeConflictPolicy', () => {
    it('boots without error when shadow=error and specificity ordering resolves all shadows', async () => {
      // The multi-user fixture has GET /users/:userId (declared first) and
      // GET /users/me (declared second). In declaration order this is a shadow
      // conflict that would abort the app. With specificity sorting, the literal
      // /users/me is registered before /:userId, so at runtime every route is
      // reachable — the shadow is resolved by the sort and should not trigger
      // shadow: 'error'.
      await expect(
        buildApp({
          routeResolutionStrategy: 'specificity',
          routeConflictPolicy: { shadow: 'error' },
        }).then(a => {
          app = a;
          return a.init();
        }),
      ).resolves.not.toThrow();
    });

    it('routes correctly when both options are active together', async () => {
      app = await buildApp({
        routeResolutionStrategy: 'specificity',
        routeConflictPolicy: { shadow: 'warn' },
      });
      await app.init();

      const meRes = await request(app.getHttpServer()).get('/users/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body).toEqual({ handler: 'me' });

      const idRes = await request(app.getHttpServer()).get('/users/42');
      expect(idRes.status).toBe(200);
      expect(idRes.body).toEqual({ handler: 'byId', userId: '42' });
    });
  });
});
