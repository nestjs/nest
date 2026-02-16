import * as request from 'supertest';
import { expect } from 'chai';
import { Test } from '@nestjs/testing';
import { Controller, Get, Param, UsePipes } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import {
  ParseIntPipe,
  ValidationPipe,
  TransformPipe,
} from '../src/pipes/validation.pipe';

@Controller('test')
class TestController {
  @Get('parse-int/:id')
  parseIntTest(@Param('id', ParseIntPipe) id: number) {
    return { id, type: typeof id };
  }

  @Get('transform/:value')
  @UsePipes(TransformPipe)
  transformTest(@Param('value') value: string) {
    return { value };
  }
}

describe('Pipes (H3 adapter)', () => {
  describe('ParseIntPipe', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should parse valid integer string', () => {
      return request(app.getHttpServer())
        .get('/test/parse-int/42')
        .expect(200)
        .expect({ id: 42, type: 'number' });
    });

    it('should fail for non-numeric string', () => {
      return request(app.getHttpServer())
        .get('/test/parse-int/abc')
        .expect(400)
        .expect(res => {
          expect(res.body.message).to.contain('numeric string is expected');
        });
    });
  });

  describe('TransformPipe', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should transform value to uppercase', () => {
      return request(app.getHttpServer())
        .get('/test/transform/hello')
        .expect(200)
        .expect({ value: 'HELLO' });
    });
  });

  describe('Global ValidationPipe', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_PIPE,
            useValue: new ValidationPipe(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should pass validation for valid params', () => {
      return request(app.getHttpServer())
        .get('/test/parse-int/123')
        .expect(200);
    });
  });
});
