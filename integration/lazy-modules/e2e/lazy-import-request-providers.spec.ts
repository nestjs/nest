import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { LazyController } from '../src/lazy.controller';

describe('Lazy Requested Scoped providers', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [LazyController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should not recreate dependencies for default scope', async () => {
    const resultOne = await request(app.getHttpServer()).get('/lazy/request');

    expect(resultOne.text).to.be.equal('Hi! Counter is 1');
    expect(resultOne.statusCode).to.be.equal(200);

    const resultTwo = await request(app.getHttpServer()).get('/lazy/request');

    expect(resultTwo.text).to.be.equal('Hi! Counter is 2');
    expect(resultTwo.statusCode).to.be.equal(200);
  });
});
