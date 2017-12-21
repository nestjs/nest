import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { CatsModule } from '../../src/modules/cats/cats.module';

describe('Cats', () => {
  const server = express();
  server.use(bodyParser.json());

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      modules: [CatsModule]
    }).compile();

    const app = module.createNestApplication(server);
    await app.init();
  });

  it(`/POST insert cat`, () => {
    return request(server)
      .post('/cats')
      .send({
        name: 'Tiger',
        age: 2,
        breed: 'Russian Blue'
      })
      .expect(201);
  });

  it(`/GET cats`, async done => {
    const cats = await request(server)
      .get('/cats')
      .expect(200);

    const [cat] = cats.body;

    expect(cat.name).toBe('Tiger');
    expect(cat.age).toBe(2);
    expect(cat.breed).toBe('Russian Blue');

    done();
  });
});
