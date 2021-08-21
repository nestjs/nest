import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ApplicationModule } from '../src/app.module';

describe('Hello world (default adapter)', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  [
    {
      host: 'example.com',
      path: '/hello',
      greeting: 'Hello world!',
    },
    {
      host: 'acme.example.com',
      path: '/host',
      greeting: 'Host Greeting! tenant=acme',
    },
    {
      host: 'acme.example1.com',
      path: '/host-array',
      greeting: 'Host Greeting! tenant=acme',
    },
    {
      host: 'acme.example2.com',
      path: '/host-array',
      greeting: 'Host Greeting! tenant=acme',
    },
  ].forEach(({ host, path, greeting }) => {
    describe(`host=${host}`, () => {
      describe('/GET', () => {
        it(`should return "${greeting}"`, () => {
          return request(server)
            .get(path)
            .set('Host', host)
            .expect(200)
            .expect(greeting);
        });

        it(`should attach response header`, () => {
          return request(server)
            .get(path)
            .set('Host', host)
            .expect(200)
            .expect('Authorization', 'Bearer');
        });
      });

      it(`/GET (Promise/async) returns "${greeting}"`, () => {
        return request(server)
          .get(`${path}/async`)
          .set('Host', host)
          .expect(200)
          .expect(greeting);
      });

      it(`/GET (Observable stream) "${greeting}"`, () => {
        return request(server)
          .get(`${path}/stream`)
          .set('Host', host)
          .expect(200)
          .expect(greeting);
      });
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
