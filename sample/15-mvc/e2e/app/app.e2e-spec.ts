import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { AppModule } from '../../src/app.module.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setBaseViewsDir(join(__dirname, '..', '..', 'views'));
    app.setViewEngine('hbs');

    await app.init();
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
