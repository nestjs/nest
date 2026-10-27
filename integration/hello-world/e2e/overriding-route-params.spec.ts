import {
  Body,
  Controller,
  Get,
  INestApplication,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

class CrudController {
  @Post()
  create(@Body() dto) {
    return { dto };
  }

  @Get(':id')
  find(@Query('page', ParseIntPipe) page): object {
    return { page };
  }
}

@Controller('items')
class ItemsController extends CrudController {
  @Post()
  override create(@Req() req, @Body() dto?) {
    return { hasRequest: typeof req?.headers === 'object', dto };
  }

  @Get(':id')
  override find(@Param('id') id) {
    return { id };
  }
}

async function createApp(adapter: ExpressAdapter | FastifyAdapter) {
  const module = await Test.createTestingModule({
    controllers: [ItemsController],
  }).compile();

  const app = module.createNestApplication<INestApplication>(adapter);
  app.useGlobalPipes(new ValidationPipe());
  return app;
}

describe('Overriding method with its own param decorators', () => {
  describe('(express adapter)', () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await createApp(new ExpressAdapter());
      await listenOnLoopback(app);
    });

    it('should pass the request to @Req() rather than the inherited @Body()', () => {
      return request(app.getHttpServer())
        .post('/items')
        .send({ name: 'x' })
        .expect(201)
        .expect({ hasRequest: true, dto: { name: 'x' } });
    });

    it('should not run the inherited @Query() pipe', () => {
      return request(app.getHttpServer())
        .get('/items/42')
        .expect(200)
        .expect({ id: '42' });
    });

    it('should not let the inherited @Query() overwrite @Param()', () => {
      return request(app.getHttpServer())
        .get('/items/42?page=7')
        .expect(200)
        .expect({ id: '42' });
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('(fastify adapter)', () => {
    let app: NestFastifyApplication;

    beforeEach(async () => {
      app = (await createApp(new FastifyAdapter())) as NestFastifyApplication;
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    it('should pass the request to @Req() rather than the inherited @Body()', async () => {
      const { statusCode, payload } = await app.inject({
        method: 'POST',
        url: '/items',
        payload: { name: 'x' },
      });
      expect(statusCode).toBe(201);
      expect(JSON.parse(payload)).toEqual({
        hasRequest: true,
        dto: { name: 'x' },
      });
    });

    it('should not run the inherited @Query() pipe', async () => {
      const { statusCode, payload } = await app.inject({
        method: 'GET',
        url: '/items/42',
      });
      expect(statusCode).toBe(200);
      expect(JSON.parse(payload)).toEqual({ id: '42' });
    });

    it('should not let the inherited @Query() overwrite @Param()', async () => {
      const { statusCode, payload } = await app.inject({
        method: 'GET',
        url: '/items/42?page=7',
      });
      expect(statusCode).toBe(200);
      expect(JSON.parse(payload)).toEqual({ id: '42' });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
