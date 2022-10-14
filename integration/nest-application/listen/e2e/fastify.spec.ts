import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';

describe('Listen (Fastify Application)', () => {
  let testModule: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = testModule.createNestApplication(new FastifyAdapter());
  });

  afterEach(async () => {
    app.close();
  });

  it('should resolve with httpServer on success', async () => {
    const response = await app.listen(3000);
    expect(response).to.eql(app.getHttpServer());
  });

  it('should reject if the port is not available', async () => {
    await app.listen(3000);
    const secondApp = testModule.createNestApplication(new FastifyAdapter());
    try {
      await secondApp.listen(3000);
    } catch (error) {
      expect(error.code).to.equal('EADDRINUSE');
    }

    await secondApp.close();
  });

  // Add Fastify support in future
  // it('should find free port if the it is not available and resolve with httpServer on success', async () => {
  //   await app.listen(4000);
  //   const secondApp = testModule.createNestApplication<INestFreePortListener>(
  //     new FastifyAdapter(),
  //   );
  //   try {
  //     let currentPort = 4000;
  //     await secondApp.listenFreePort({
  //       port: 4000,
  //       onStart: port => (currentPort = port),
  //     });
  //
  //     expect(currentPort).to.eql(4001);
  //   } catch (error) {
  //     console.trace(error);
  //     expect(error).to.eql(undefined);
  //   } finally {
  //     await secondApp.close();
  //   }
  // });

  it('should reject if there is an invalid host', async () => {
    try {
      await app.listen(3000, '1');
    } catch (error) {
      expect(error.code).to.equal('EADDRNOTAVAIL');
    }
  });
});
