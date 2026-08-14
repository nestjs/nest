import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('CatsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    const options = new DocumentBuilder()
      .setTitle('Cats example')
      .setDescription('The cats API description')
      .setVersion('1.0')
      .addTag('cats')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('api', app, document);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /cats', () => {
    it('should create a cat', async () => {
      const createCatDto = { name: 'Whiskers', age: 3, breed: 'Persian' };

      const response = await request(app.getHttpServer())
        .post('/cats')
        .send(createCatDto)
        .expect(201);

      expect(response.body).toMatchObject(createCatDto);
    });

    it('should reject invalid cat data', async () => {
      await request(app.getHttpServer())
        .post('/cats')
        .send({ name: 123, age: 'not-a-number' })
        .expect(400);
    });
  });

  describe('GET /cats/:id', () => {
    it('should return a cat by index', async () => {
      const createCatDto = { name: 'Milo', age: 2, breed: 'Siamese' };

      await request(app.getHttpServer())
        .post('/cats')
        .send(createCatDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/cats/1')
        .expect(200);

      expect(response.body).toMatchObject(createCatDto);
    });
  });

  describe('Swagger documentation', () => {
    it('should serve the Swagger JSON document at /api-json', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      expect(response.body.info.title).toBe('Cats example');
      expect(response.body.info.version).toBe('1.0');
      expect(response.body.paths['/cats']).toBeDefined();
      expect(response.body.paths['/cats/{id}']).toBeDefined();
    });

    it('should serve the Swagger UI at /api/', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/')
        .expect(200);

      expect(response.text).toContain('swagger');
    });
  });
});
