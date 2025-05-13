import { Controller, Get, INestApplication, Query, Req } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestExpressApplication } from '@nestjs/platform-express/interfaces/nest-express-application.interface';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { expect } from 'chai';
import * as express from 'express';
import * as sinon from 'sinon';
import { Request } from 'express';

@Controller('test')
export class AppController {
  @Get()
  getQuery(@Req() req: Request) {
    const normalizedQuery = req.query;
    const response = Object.entries(normalizedQuery)
      .map(([key, value]) => {
        const displayValue = Array.isArray(value)
          ? value.join(', ')
          : (value?.toString() ?? 'undefined');
        return `${key}: ${displayValue}`;
      })
      .join(', ');
    return response || 'No query parameters provided';
  }
}

describe('ExpressAdapter', () => {
  afterEach(() => sinon.restore());

  describe('registerParserMiddleware', () => {
    it('should register the express built-in parsers for json and urlencoded payloads', () => {
      const expressInstance = express();
      const jsonParserInstance = express.json();
      const urlencodedInstance = express.urlencoded();
      const jsonParserSpy = sinon
        .stub(express, 'json')
        .returns(jsonParserInstance);
      const urlencodedParserSpy = sinon
        .stub(express, 'urlencoded')
        .returns(urlencodedInstance);
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);

      expressAdapter.registerParserMiddleware();

      expect(useSpy.calledTwice).to.be.true;
      expect(useSpy.calledWith(sinon.match.same(jsonParserInstance))).to.be
        .true;
      expect(useSpy.calledWith(sinon.match.same(urlencodedInstance))).to.be
        .true;
      expect(jsonParserSpy.calledOnceWith({})).to.be.true;
      expect(urlencodedParserSpy.calledOnceWith({ extended: true })).to.be.true;
    });

    it('should not register default parsers if custom parsers have already been registered', () => {
      const expressInstance = express();
      expressInstance.use(function jsonParser() {});
      expressInstance.use(function urlencodedParser() {});
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);

      expressAdapter.registerParserMiddleware();

      expect(useSpy.called).to.be.false;
    });
  });

  describe('ExpressAdapter', () => {
    let app: INestApplication & NestExpressApplication;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [AppController],
      }).compile();
      app = module.createNestApplication<NestExpressApplication>(
        new ExpressAdapter(),
        {},
      );
      app.enableCaseInsensitiveQueries();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('normalizes all query parameters to lowercase', async () => {
      await request(app.getHttpServer())
        .get('/test?NAME=John&AGE=30&CiTy=NewYork&EMAIL=john@example.com')
        .expect(
          200,
          'name: John, age: 30, city: NewYork, email: john@example.com',
        );
    });

    it('handles empty queries', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .expect(200, 'No query parameters provided');
    });

    it('handles arrays and nested objects', async () => {
      await request(app.getHttpServer())
        .get(
          '/test?NAMES=John,Jane&AGE=30&DETAILS[address]=123+St&DETAILS[city]=NY',
        )
        .expect(
          200,
          'names: John, Jane, age: 30, details[address]: 123 St, details[city]: NY',
        );
    });
  });
});
