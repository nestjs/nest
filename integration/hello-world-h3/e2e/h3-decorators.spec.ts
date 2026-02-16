import { Controller, Get, INestApplication, Post, Body } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  H3Adapter,
  NestH3Application,
  H3Event,
  H3Request,
  H3Response,
  H3Query,
  H3Params,
  H3Body,
} from '@nestjs/platform-h3';
import type { H3Event as H3EventType } from 'h3';
import type { ServerResponse } from 'http';
import * as request from 'supertest';
import { expect } from 'chai';

@Controller('decorators')
class DecoratorsController {
  @Get('event')
  getEvent(@H3Event() event: H3EventType) {
    // Return relevant properties to verify the event is correct
    return {
      hasEvent: !!event,
      hasNode: !!(event as any)?.node,
      path: event?.path,
    };
  }

  @Get('request')
  getRequest(@H3Request() req: any) {
    return {
      hasRequest: !!req,
      method: req?.method,
      hasH3Event: !!req?.h3Event,
    };
  }

  @Get('response')
  getResponse(@H3Response() res: ServerResponse) {
    // Set a custom header to verify the response object works
    res.setHeader('X-Custom-Header', 'test-value');
    return {
      hasResponse: !!res,
      isWritable: res?.writable !== undefined,
    };
  }

  @Get('query')
  getQuery(@H3Query() query: Record<string, any>) {
    return { query };
  }

  @Get('query-key')
  getQueryKey(@H3Query('name') name: string, @H3Query('age') age: string) {
    return { name, age };
  }

  @Get('params/:id')
  getParams(@H3Params() params: Record<string, any>) {
    return { params };
  }

  @Get('params/:category/:id')
  getParamsMultiple(@H3Params() params: Record<string, any>) {
    return { params };
  }

  @Get('params-key/:id')
  getParamsKey(@H3Params('id') id: string) {
    return { id };
  }

  @Post('body')
  getBody(@H3Body() body: any) {
    return { body };
  }

  @Post('body-key')
  getBodyKey(@H3Body('name') name: string, @H3Body('email') email: string) {
    return { name, email };
  }

  @Get('combined/:id')
  getCombined(
    @H3Event() event: H3EventType,
    @H3Request() req: any,
    @H3Params('id') id: string,
    @H3Query('filter') filter: string,
  ) {
    return {
      id,
      filter,
      hasEvent: !!event,
      method: req?.method,
    };
  }
}

describe('H3 Custom Decorators', () => {
  let app: NestH3Application;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DecoratorsController],
    }).compile();

    app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  describe('@H3Event()', () => {
    it('should inject the H3 event object', () => {
      return request(app.getHttpServer())
        .get('/decorators/event')
        .expect(200)
        .expect(res => {
          expect(res.body.hasEvent).to.be.true;
          expect(res.body.hasNode).to.be.true;
          expect(res.body.path).to.equal('/decorators/event');
        });
    });
  });

  describe('@H3Request()', () => {
    it('should inject the request object with H3 properties', () => {
      return request(app.getHttpServer())
        .get('/decorators/request')
        .expect(200)
        .expect(res => {
          expect(res.body.hasRequest).to.be.true;
          expect(res.body.method).to.equal('GET');
          expect(res.body.hasH3Event).to.be.true;
        });
    });
  });

  describe('@H3Response()', () => {
    it('should inject the response object and allow setting headers', () => {
      return request(app.getHttpServer())
        .get('/decorators/response')
        .expect(200)
        .expect('X-Custom-Header', 'test-value')
        .expect(res => {
          expect(res.body.hasResponse).to.be.true;
          expect(res.body.isWritable).to.be.true;
        });
    });
  });

  describe('@H3Query()', () => {
    it('should inject all query parameters when no key is provided', () => {
      return request(app.getHttpServer())
        .get('/decorators/query?name=John&age=30&active=true')
        .expect(200)
        .expect(res => {
          expect(res.body.query).to.deep.equal({
            name: 'John',
            age: '30',
            active: 'true',
          });
        });
    });

    it('should return empty object when no query parameters are provided', () => {
      return request(app.getHttpServer())
        .get('/decorators/query')
        .expect(200)
        .expect(res => {
          expect(res.body.query).to.deep.equal({});
        });
    });

    it('should inject specific query parameter when key is provided', () => {
      return request(app.getHttpServer())
        .get('/decorators/query-key?name=Jane&age=25')
        .expect(200)
        .expect(res => {
          expect(res.body.name).to.equal('Jane');
          expect(res.body.age).to.equal('25');
        });
    });

    it('should return undefined for missing query parameter', () => {
      return request(app.getHttpServer())
        .get('/decorators/query-key?name=Jane')
        .expect(200)
        .expect(res => {
          expect(res.body.name).to.equal('Jane');
          expect(res.body.age).to.be.undefined;
        });
    });
  });

  describe('@H3Params()', () => {
    it('should inject all route parameters when no key is provided', () => {
      return request(app.getHttpServer())
        .get('/decorators/params/123')
        .expect(200)
        .expect(res => {
          expect(res.body.params).to.deep.equal({ id: '123' });
        });
    });

    it('should inject multiple route parameters', () => {
      return request(app.getHttpServer())
        .get('/decorators/params/electronics/456')
        .expect(200)
        .expect(res => {
          expect(res.body.params).to.deep.equal({
            category: 'electronics',
            id: '456',
          });
        });
    });

    it('should inject specific route parameter when key is provided', () => {
      return request(app.getHttpServer())
        .get('/decorators/params-key/789')
        .expect(200)
        .expect(res => {
          expect(res.body.id).to.equal('789');
        });
    });
  });

  describe('@H3Body()', () => {
    it('should inject entire body when no key is provided', () => {
      return request(app.getHttpServer())
        .post('/decorators/body')
        .send({ name: 'John', email: 'john@example.com', age: 30 })
        .expect(201)
        .expect(res => {
          expect(res.body.body).to.deep.equal({
            name: 'John',
            email: 'john@example.com',
            age: 30,
          });
        });
    });

    it('should return empty object when no body is provided', () => {
      return request(app.getHttpServer())
        .post('/decorators/body')
        .expect(201)
        .expect(res => {
          expect(res.body.body).to.deep.equal({});
        });
    });

    it('should inject specific body property when key is provided', () => {
      return request(app.getHttpServer())
        .post('/decorators/body-key')
        .send({ name: 'Jane', email: 'jane@example.com', extra: 'ignored' })
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.equal('Jane');
          expect(res.body.email).to.equal('jane@example.com');
        });
    });

    it('should return undefined for missing body property', () => {
      return request(app.getHttpServer())
        .post('/decorators/body-key')
        .send({ name: 'Jane' })
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.equal('Jane');
          expect(res.body.email).to.be.undefined;
        });
    });
  });

  describe('Combined decorators', () => {
    it('should work when multiple decorators are used together', () => {
      return request(app.getHttpServer())
        .get('/decorators/combined/42?filter=active')
        .expect(200)
        .expect(res => {
          expect(res.body.id).to.equal('42');
          expect(res.body.filter).to.equal('active');
          expect(res.body.hasEvent).to.be.true;
          expect(res.body.method).to.equal('GET');
        });
    });
  });
});
