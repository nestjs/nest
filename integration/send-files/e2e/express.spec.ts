import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  getHttpBaseOptions,
  sendCanceledHttpRequest,
  sendHttpRequest,
} from './utils';

const readme = readFileSync(join(process.cwd(), 'Readme.md'));
const readmeString = readme.toString();

describe('Express FileSend', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication(new ExpressAdapter());
    await app.init();
  });

  it('should return a file from a stream', async () => {
    return request(app.getHttpServer())
      .get('/file/stream/')
      .expect(200)
      .expect(res => {
        expect(res.body.toString()).to.be.eq(readmeString);
      });
  });
  it('should return a file from a buffer', async () => {
    return request(app.getHttpServer())
      .get('/file/buffer')
      .expect(200)
      .expect(res => {
        expect(res.body.toString()).to.be.eq(readmeString);
      });
  });
  it('should not stream a non-file', async () => {
    return request(app.getHttpServer())
      .get('/non-file/pipe-method')
      .expect(200)
      .expect({ value: 'Hello world' });
  });
  it('should return a file from an RxJS stream', async () => {
    return request(app.getHttpServer())
      .get('/file/rxjs/stream/')
      .expect(200)
      .expect(res => {
        expect(res.body.toString()).to.be.eq(readmeString);
      });
  });
  it('should return a file with correct headers', async () => {
    return request(app.getHttpServer())
      .get('/file/with/headers')
      .expect(200)
      .expect('Content-Type', 'text/markdown')
      .expect('Content-Disposition', 'attachment; filename="Readme.md"')
      .expect('Content-Length', readme.byteLength.toString())
      .expect(res => {
        expect(res.text).to.be.eq(readmeString);
      });
  });
  it('should return an error if the file does not exist', async () => {
    return request(app.getHttpServer()).get('/file/not/exist').expect(400);
  });
  // TODO: temporarily turned off (flaky test)
  it.skip(
    'should allow for the client to end the response and be able to make another',
    async () => {
      await app.listen(0);
      const url = await getHttpBaseOptions(app);
      await sendCanceledHttpRequest(new URL('/file/slow', url));
      const res = await sendHttpRequest(new URL('/file/stream', url));
      expect(res.statusCode).to.be.eq(200);
    },
  ).timeout(5000);
});
