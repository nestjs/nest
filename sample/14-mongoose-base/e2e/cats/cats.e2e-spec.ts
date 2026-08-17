import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import request from 'supertest';
import { CatsModule } from '../../src/cats/cats.module.js';
import { DatabaseModule } from '../../src/database/database.module.js';

describe('CatsController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CatsModule],
    })
      .overrideProvider('DATABASE_CONNECTION')
      .useFactory({
        factory: async () => await mongoose.connect(mongoUri),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await app.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /cats', () => {
    it('should create a new cat and return it', async () => {
      const createCatDto = { name: 'Whiskers', age: 3, breed: 'Persian' };

      const response = await request(app.getHttpServer())
        .post('/cats')
        .send(createCatDto)
        .expect(201);

      expect(response.body).toMatchObject(createCatDto);
      expect(response.body._id).toBeDefined();
    });

    it('should persist the cat to the database', async () => {
      const createCatDto = { name: 'Luna', age: 2, breed: 'Siamese' };

      await request(app.getHttpServer())
        .post('/cats')
        .send(createCatDto)
        .expect(201);

      const catInDb = await mongoose.connection
        .collection('cats')
        .findOne({ name: 'Luna' });
      expect(catInDb).not.toBeNull();
      expect(catInDb?.breed).toBe('Siamese');
    });
  });

  describe('GET /cats', () => {
    it('should return an empty array when no cats exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/cats')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all cats', async () => {
      await mongoose.connection.collection('cats').insertMany([
        { name: 'Whiskers', age: 3, breed: 'Persian' },
        { name: 'Luna', age: 2, breed: 'Siamese' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/cats')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Whiskers', breed: 'Persian' }),
          expect.objectContaining({ name: 'Luna', breed: 'Siamese' }),
        ]),
      );
    });
  });
});
