import { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { WildcardModule } from '../src/wildcard/wildcard.module.js';

async function buildApp(
  options: NestApplicationOptions,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [WildcardModule],
  }).compile();
  return moduleRef.createNestApplication(options);
}

describe('Route resolution strategy with wildcards: specificity (Express)', () => {
  let app: INestApplication | undefined;

  beforeEach(async () => {
    app = await buildApp({ routerResolutionStrategy: 'specificity' });
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('routes `/files/readme` to the literal handler (literal beats param and wildcard)', async () => {
    const response = await request(app!.getHttpServer()).get('/files/readme');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ handler: 'readme' });
  });

  it('routes `/files/42` to the param handler (param beats wildcard)', async () => {
    const response = await request(app!.getHttpServer()).get('/files/42');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ handler: 'byId', fileId: '42' });
  });

  it('routes `/files/some/nested/path` to the wildcard handler (only wildcard matches multi-segment)', async () => {
    const response = await request(app!.getHttpServer()).get(
      '/files/some/nested/path',
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ handler: 'catchAll' });
  });

  it('routes unknown single-segment paths to the param handler, not the wildcard', async () => {
    const response = await request(app!.getHttpServer()).get(
      '/files/anything-here',
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ handler: 'byId', fileId: 'anything-here' });
  });

  it('returns 404 for the controller root `/files` (wildcard requires at least one extra segment)', async () => {
    const response = await request(app!.getHttpServer()).get('/files');
    expect(response.status).toBe(404);
  });

  it('returns 404 for paths outside the controller prefix', async () => {
    const response = await request(app!.getHttpServer()).get('/other/path');
    expect(response.status).toBe(404);
  });

  it('returns 404 for the root path', async () => {
    const response = await request(app!.getHttpServer()).get('/');
    expect(response.status).toBe(404);
  });

  it('returns 404 for a known path on the wrong HTTP method', async () => {
    const response = await request(app!.getHttpServer()).post('/files/readme');
    expect(response.status).toBe(404);
  });
});
