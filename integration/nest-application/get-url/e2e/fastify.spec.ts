import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';

import { AppModule } from '../src/app.module';

import { randomPort } from './utils';

describe('Get URL (Fastify Application)', () => {
  let testModule: TestingModule;
  let port: number;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  beforeEach(async () => {
    port = await randomPort();
  });

  it('should be able to get the IPv4 address', async () => {
    const app = testModule.createNestApplication(new FastifyAdapter());
    await app.listen(port, '127.0.0.5');
    expect(await app.getUrl()).to.be.eql(`http://127.0.0.5:${port}`);
    await app.close();
  });
  it('should return 127.0.0.1 for 0.0.0.0', async () => {
    const app = testModule.createNestApplication(new FastifyAdapter());
    await app.listen(port, '0.0.0.0');
    expect(await app.getUrl()).to.be.eql(`http://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return 127.0.0.1 even in a callback', () => {
    const app = testModule.createNestApplication(new FastifyAdapter());
    return app.listen(port, async () => {
      expect(await app.getUrl()).to.be.eql(`http://127.0.0.1:${port}`);
      await app.close();
    });
  });
  it('should throw an error for calling getUrl before listen', async () => {
    const app = testModule.createNestApplication(new FastifyAdapter());
    try {
      await app.getUrl();
    } catch (err) {
      expect(err).to.be.eql(
        'app.listen() needs to be called before calling app.getUrl()',
      );
    }
  });
});
