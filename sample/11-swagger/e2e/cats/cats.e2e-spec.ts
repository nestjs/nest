import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Swagger Cats (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

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

  it('/cats (POST)', () => {
    return request(app.getHttpServer())
      .post('/cats')
      .send({ name: 'Kitty', age: 2, breed: 'Maine Coon' })
      .expect(201)
      .expect(res => {
        expect(res.body.name).toBe('Kitty');
        expect(res.body.age).toBe(2);
        expect(res.body.breed).toBe('Maine Coon');
      });
  });

  it('/cats/:id (GET)', async () => {
    // First create a cat
    await request(app.getHttpServer())
      .post('/cats')
      .send({ name: 'Whiskers', age: 3, breed: 'Persian' })
      .expect(201);

    return request(app.getHttpServer())
      .get('/cats/0')
      .expect(200)
      .expect(res => {
        expect(res.body.name).toBe('Kitty');
      });
  });

  it('/api-json (GET) should return Swagger JSON', () => {
    return request(app.getHttpServer())
      .get('/api-json')
      .expect(200)
      .expect(res => {
        expect(res.body.openapi).toBeDefined();
        expect(res.body.info.title).toBe('Cats example');
        expect(res.body.paths['/cats']).toBeDefined();
        expect(res.body.paths['/cats/{id}']).toBeDefined();
      });
  });
});
