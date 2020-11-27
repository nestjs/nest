import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const readmeString = readFileSync(join(process.cwd(), 'Readme.md')).toString();

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
      .expect((res) => {
        expect(res.body.toString()).to.be.eq(readmeString);
      });
  });
  it('should return a file from a buffer', async () => {
    return request(app.getHttpServer())
      .get('/file/buffer')
      .expect(200)
      .expect((res) => {
        expect(res.body.toString()).to.be.eq(readmeString);
      });
  });
  it('should not stream a non-file', async () => {
    return request(app.getHttpServer())
      .get('/non-file/pipe-method')
      .expect(200)
      .expect({ value: 'Hello world' });
  });
});