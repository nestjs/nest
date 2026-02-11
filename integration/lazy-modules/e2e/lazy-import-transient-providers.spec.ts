import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransientLazyModule } from '../src/transient.module.js';
import { LazyController } from '../src/lazy.controller.js';
import request from 'supertest';

describe('Lazy Transient providers', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [LazyController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should not recreate dependencies for default scope', async () => {
    const resultOne = await request(app.getHttpServer()).get('/lazy/transient');

    const resultTwo = await request(app.getHttpServer()).get('/lazy/transient');

    expect(resultOne.text).toBe('Hi! Counter is 1');
    expect(resultOne.statusCode).toBe(200);

    expect(resultTwo.text).toBe('Hi! Counter is 2');
    expect(resultTwo.statusCode).toBe(200);
  });
});
