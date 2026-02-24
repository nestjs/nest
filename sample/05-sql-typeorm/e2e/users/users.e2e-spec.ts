import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { UsersModule } from '../../src/users/users.module.js';
import { User } from '../../src/users/user.entity.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
  }, 30000);

  afterEach(async () => {
    await userRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a new user and return it', async () => {
      const createUserDto = { firstName: 'John', lastName: 'Doe' };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject(createUserDto);
      expect(response.body.id).toBeDefined();
    });

    it('should persist the user to the database', async () => {
      const createUserDto = { firstName: 'Jane', lastName: 'Doe' };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const userInDb = await userRepository.findOneBy({ firstName: 'Jane' });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.lastName).toBe('Doe');
    });
  });

  describe('GET /users', () => {
    it('should return an empty array when no users exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all users', async () => {
      await userRepository.save([
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Doe' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ firstName: 'John', lastName: 'Doe' }),
          expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }),
        ]),
      );
    });
  });

  describe('GET /users/:id', () => {
    it('should return a single user by id', async () => {
      const createdUser = await userRepository.save({
        firstName: 'John',
        lastName: 'Doe',
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${createdUser.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      const createdUser = await userRepository.save({
        firstName: 'John',
        lastName: 'Doe',
      });

      await request(app.getHttpServer())
        .delete(`/users/${createdUser.id}`)
        .expect(200);
    });

    it('should remove the user from the database', async () => {
      const createdUser = await userRepository.save({
        firstName: 'John',
        lastName: 'Doe',
      });

      await request(app.getHttpServer())
        .delete(`/users/${createdUser.id}`)
        .expect(200);

      const deletedUser = await userRepository.findOneBy({
        id: createdUser.id,
      });
      expect(deletedUser).toBeNull();
    });
  });
});
