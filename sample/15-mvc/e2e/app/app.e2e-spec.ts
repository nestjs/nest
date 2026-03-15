import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('MVC (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setBaseViewsDir(join(__dirname, '../../views'));
    app.setViewEngine('hbs');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should render the index template with hello message', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Hello world!');
      });
  });
});
