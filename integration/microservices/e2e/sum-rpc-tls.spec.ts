import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'supertest';
import { AppController } from '../src/tcp-tls/app.controller';
import { ApplicationModule } from '../src/tcp-tls/app.module';

describe('RPC TLS transport', () => {
  let server;
  let app: INestApplication;
  let key: string;
  let cert: string;

  before(() => {
    // Generate a self-signed key pair
    key = fs
      .readFileSync(path.join(__dirname, '../src/tcp-tls/privkey.pem'), 'utf8')
      .toString();
    cert = fs
      .readFileSync(path.join(__dirname, '../src/tcp-tls/ca.cert.pem'), 'utf8')
      .toString();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        tlsOptions: { key: key, cert: cert },
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`/POST TLS`, () => {
    return request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (Promise/async)`, () => {
    return request(server)
      .post('/?command=asyncSum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (Observable stream)`, () => {
    return request(server)
      .post('/?command=streamSum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (useFactory client)`, () => {
    return request(server)
      .post('/useFactory?command=sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (useClass client)`, () => {
    return request(server)
      .post('/useClass?command=sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (concurrent)`, () => {
    return request(server)
      .post('/concurrent')
      .send([
        Array.from({ length: 10 }, (v, k) => k + 1),
        Array.from({ length: 10 }, (v, k) => k + 11),
        Array.from({ length: 10 }, (v, k) => k + 21),
        Array.from({ length: 10 }, (v, k) => k + 31),
        Array.from({ length: 10 }, (v, k) => k + 41),
        Array.from({ length: 10 }, (v, k) => k + 51),
        Array.from({ length: 10 }, (v, k) => k + 61),
        Array.from({ length: 10 }, (v, k) => k + 71),
        Array.from({ length: 10 }, (v, k) => k + 81),
        Array.from({ length: 10 }, (v, k) => k + 91),
      ])
      .expect(200, 'true');
  });

  it(`/POST (streaming)`, () => {
    return request(server)
      .post('/stream')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (pattern not found)`, () => {
    return request(server).post('/?command=test').expect(500);
  });

  it(`/POST (event notification)`, done => {
    void request(server)
      .post('/notify')
      .send([1, 2, 3, 4, 5])
      .end(() => {
        setTimeout(() => {
          expect(AppController.IS_NOTIFIED).to.be.true;
          done();
        }, 1000);
      });
  });

  it('/POST (custom client)', () => {
    return request(server)
      .post('/error?client=custom')
      .send({})
      .expect(200)
      .expect('true');
  });

  it('/POST (standard client)', () => {
    return request(server)
      .post('/error?client=standard')
      .send({})
      .expect(200)
      .expect('false');
  });

  afterEach(async () => {
    await app.close();
  });
});
