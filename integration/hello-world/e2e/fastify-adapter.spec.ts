import { expect } from 'chai';
import * as fastify from 'fastify';
import * as request from 'supertest';
import * as express from 'express';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ApplicationModule } from './../src/app.module';
import { FastifyAdapter } from '@nestjs/core/adapters/fastify-adapter';
import { ExpressAdapter } from '@nestjs/core/adapters/express-adapter';
import { HelloService } from '../src/hello/hello.service';

describe('Hello world (fastify adapter)', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    server = fastify();
    app = module.createNestApplication(new FastifyAdapter(server));
    await app.init();
  });

  it(`/GET`, () => {
    return server
      .inject({
        method: 'GET',
        url: '/hello',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (Promise/async)`, () => {
    return server
      .inject({
        method: 'GET',
        url: '/hello/async',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  it(`/GET (Observable stream)`, () => {
    return server
      .inject({
        method: 'GET',
        url: '/hello/stream',
      })
      .then(({ payload }) => expect(payload).to.be.eql('Hello world!'));
  });

  afterEach(async () => {
    await app.close();
  });
});
