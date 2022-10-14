import { ExpressAdapter } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import * as express from 'express';
import { AppModule } from '../src/app.module';
import { INestApplication, INestFreePortListener } from '@nestjs/common';

describe('Listen (Express Application)', () => {
  let testModule: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = testModule.createNestApplication(new ExpressAdapter(express()));
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
    const secondApp = testModule.createNestApplication(
      new ExpressAdapter(express()),
    );
    try {
      await secondApp.listen(3000);
    } catch (error) {
      expect(error.code).to.equal('EADDRINUSE');
    }
  });

  it('should find free port if the it is not available and resolve with httpServer on success', async () => {
    await app.listen(3000);
    const secondApp = testModule.createNestApplication<INestFreePortListener>(
      new ExpressAdapter(express()),
    );
    try {
      let currentPort = 3000;
      await secondApp.listenFreePort({
        port: 3000,
        onStart: port => (currentPort = port),
      });

      expect(currentPort).to.eql(3001);
    } catch (error) {
      console.trace(error);
      expect(error).to.eql(undefined);
    } finally {
      await secondApp.close();
    }
  });

  it('should reject if there is an invalid host', async () => {
    try {
      await app.listen(3000, '1');
    } catch (error) {
      expect(error.code).to.equal('EADDRNOTAVAIL');
    }
  });
});
