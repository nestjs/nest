import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransientLazyModule } from '../src/transient.module';
import { LazyController } from '../src/lazy.controller';
import * as chai from 'chai';
import { expect } from 'chai';
import * as request from 'supertest';

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

    expect(resultOne.text).to.be.equal('Hi! Counter is 1');
    expect(resultOne.statusCode).to.be.equal(200);

    expect(resultTwo.text).to.be.equal('Hi! Counter is 2');
    expect(resultTwo.statusCode).to.be.equal(200);
  });
});
