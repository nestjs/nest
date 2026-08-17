import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import request from 'supertest';
import { CatsModule } from '../../src/cats/cats.module.js';
import { Cat } from '../../src/cats/schemas/cat.schema.js';
import { Model } from 'mongoose';

describe('CatsController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let catModel: Model<Cat>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), CatsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    catModel = moduleFixture.get<Model<Cat>>(getModelToken(Cat.name));
  }, 30000);

  afterEach(async () => {
    await catModel.deleteMany({});
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

      const catInDb = await catModel.findOne({ name: 'Luna' });
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
      await catModel.create([
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

  describe('GET /cats/:id', () => {
    it('should return a single cat by id', async () => {
      const createdCat = await catModel.create({
        name: 'Whiskers',
        age: 3,
        breed: 'Persian',
      });

      const response = await request(app.getHttpServer())
        .get(`/cats/${createdCat._id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Whiskers',
        age: 3,
        breed: 'Persian',
      });
    });
  });

  describe('POST /cats/:id (update)', () => {
    it('should update a cat and return the updated document', async () => {
      const createdCat = await catModel.create({
        name: 'Whiskers',
        age: 3,
        breed: 'Persian',
      });

      const response = await request(app.getHttpServer())
        .post(`/cats/${createdCat._id}`)
        .send({ age: 5 })
        .expect(201);

      expect(response.body.age).toBe(5);
      expect(response.body.name).toBe('Whiskers');
    });

    it('should persist the update to the database', async () => {
      const createdCat = await catModel.create({
        name: 'Whiskers',
        age: 3,
        breed: 'Persian',
      });

      await request(app.getHttpServer())
        .post(`/cats/${createdCat._id}`)
        .send({ age: 10 })
        .expect(201);

      const updatedCat = await catModel.findById(createdCat._id);
      expect(updatedCat?.age).toBe(10);
    });
  });

  describe('DELETE /cats/:id', () => {
    it('should delete a cat and return the deleted document', async () => {
      const createdCat = await catModel.create({
        name: 'Whiskers',
        age: 3,
        breed: 'Persian',
      });

      const response = await request(app.getHttpServer())
        .delete(`/cats/${createdCat._id}`)
        .expect(200);

      expect(response.body).toMatchObject({ name: 'Whiskers' });
    });

    it('should remove the cat from the database', async () => {
      const createdCat = await catModel.create({
        name: 'Whiskers',
        age: 3,
        breed: 'Persian',
      });

      await request(app.getHttpServer())
        .delete(`/cats/${createdCat._id}`)
        .expect(200);

      const deletedCat = await catModel.findById(createdCat._id);
      expect(deletedCat).toBeNull();
    });
  });
});
