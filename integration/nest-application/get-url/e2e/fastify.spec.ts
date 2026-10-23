import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { randomPort, readTlsOptions } from './utils.js';

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
    await app.listen(port, '127.0.0.1');
    expect(await app.getUrl()).toEqual(`http://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return 127.0.0.1 for 0.0.0.0', async () => {
    const app = testModule.createNestApplication(new FastifyAdapter());
    await app.listen(port, '0.0.0.0');
    expect(await app.getUrl()).toEqual(`http://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return a loopback address in a callback (default bind)', () => {
    const app = testModule.createNestApplication(new FastifyAdapter());
    return app.listen(port, async () => {
      expect(await app.getUrl()).toMatch(
        new RegExp(`http://(\\[::1\\]|127\\.0\\.0\\.1):${port}`),
      );
      await app.close();
    });
  });
  it('should throw an error for calling getUrl before listen', async () => {
    const app = testModule.createNestApplication(new FastifyAdapter());
    await expect(app.getUrl()).rejects.toEqual(
      'app.listen() needs to be called before calling app.getUrl()',
    );
  });
  it('should return an https url when the adapter serves https', async () => {
    const app = testModule.createNestApplication(
      new FastifyAdapter({ https: readTlsOptions() }),
    );
    await app.listen(port, '127.0.0.1');
    expect(await app.getUrl()).toEqual(`https://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return an https url when the adapter serves http2 over tls', async () => {
    const app = testModule.createNestApplication(
      new FastifyAdapter({ http2: true, https: readTlsOptions() }),
    );
    await app.listen(port, '127.0.0.1');
    expect(await app.getUrl()).toEqual(`https://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return an http url for "httpsOptions", which the adapter does not use', async () => {
    const app = testModule.createNestApplication(new FastifyAdapter(), {
      httpsOptions: readTlsOptions(),
    });
    await app.listen(port, '127.0.0.1');
    expect(await app.getUrl()).toEqual(`http://127.0.0.1:${port}`);
    await app.close();
  });
});
