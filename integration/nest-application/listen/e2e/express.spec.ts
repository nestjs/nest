import { INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import express from 'express';
import { AppModule } from '../src/app.module.js';

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
    await app.close();
  });

  it('should resolve with httpServer on success', async () => {
    const response = await app.listen(3000);
    expect(response).toEqual(app.getHttpServer());
  });

  it('should reject if the port is not available', async () => {
    await app.listen(3000);
    const secondApp = testModule.createNestApplication(
      new ExpressAdapter(express()),
    );
    await expect(secondApp.listen(3000)).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
  });

  it('should reject if there is an invalid host', async () => {
    await expect(app.listen(3000, '1')).rejects.toMatchObject({
      code: 'EADDRNOTAVAIL',
    });
  });
});
