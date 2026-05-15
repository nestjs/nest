import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';
import { AppModule } from '../../src/app.module.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setViewEngine({
      engine: {
        handlebars,
      },
      templates: join(__dirname, '..', '..', 'views'),
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return HTML content', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /html/);
    });

    it('should render the template with the message variable', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.text).toContain('Hello world!');
    });

    it('should return a valid HTML document', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('<html');
    });
  });
});
