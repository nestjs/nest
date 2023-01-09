import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { expect } from 'chai';
import { AppWithMiddlewareModule } from '../src/app-with-middleware.module';
import * as sinon from 'sinon';
import { SpyInjectToken } from '../src/versioning-middleware';

describe('MiddlewareVersioning', () => {
  let app: INestApplication;
  let spy = sinon.spy();

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppWithMiddlewareModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '-default-version',
    });
    await app.init();

    spy = app.get<sinon.SinonSpy>(SpyInjectToken);
  });

  beforeEach(() => spy.resetHistory());

  ['/v-default-version/foo/bar', '/v1/', '/v3', '/v4'].forEach(path => {
    it('should call middleware for route with version', async () => {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.status).to.eq(200);
      expect(spy.called).to.be.true;
    });
  });

  it('should not call middleware if the controller route is not defined', async () => {
    const response = await request(app.getHttpServer()).get('/v2/');

    expect(response.status).to.eq(200);
    expect(spy.called).to.be.false;
  });

  after(() => app.close());
});
