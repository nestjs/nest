import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { PhotoModule } from '../../src/photo/photo.module.js';
import { Photo } from '../../src/photo/photo.entity.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';

describe('PhotoController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let photoRepository: MongoRepository<Photo>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'mongodb',
          url: mongoUri,
          entities: [Photo],
          synchronize: true,
        }),
        PhotoModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    photoRepository = moduleFixture.get<MongoRepository<Photo>>(
      getRepositoryToken(Photo),
    );
  }, 30000);

  afterEach(async () => {
    await photoRepository.clear();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('GET /photo', () => {
    it('should return an empty array when no photos exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/photo')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all photos', async () => {
      await photoRepository.save([
        {
          name: 'Photo #1',
          description: 'Description #1',
          filename: 'photo1.jpg',
          isPublished: true,
        },
        {
          name: 'Photo #2',
          description: 'Description #2',
          filename: 'photo2.jpg',
          isPublished: false,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/photo')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Photo #1', filename: 'photo1.jpg' }),
          expect.objectContaining({ name: 'Photo #2', filename: 'photo2.jpg' }),
        ]),
      );
    });
  });
});
