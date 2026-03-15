import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';

describe('SQL TypeORM Users (e2e)', () => {
  let app: INestApplication;

  const mockUsers = [
    { id: 1, firstName: 'John', lastName: 'Doe', isActive: true },
    { id: 2, firstName: 'Jane', lastName: 'Smith', isActive: true },
  ];

  const mockUsersService = {
    create: jest
      .fn()
      .mockImplementation(dto =>
        Promise.resolve({ id: 3, ...dto, isActive: true }),
      ),
    findAll: jest.fn().mockResolvedValue(mockUsers),
    findOne: jest
      .fn()
      .mockImplementation((id: number) =>
        Promise.resolve(mockUsers.find(u => u.id === id)),
      ),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ firstName: 'Alice', lastName: 'Wonder' })
      .expect(201)
      .expect(res => {
        expect(res.body.firstName).toBe('Alice');
        expect(res.body.lastName).toBe('Wonder');
        expect(res.body.id).toBeDefined();
      });
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
      });
  });

  it('/users/:id (GET)', () => {
    return request(app.getHttpServer())
      .get('/users/1')
      .expect(200)
      .expect(res => {
        expect(res.body.firstName).toBe('John');
        expect(res.body.lastName).toBe('Doe');
      });
  });

  it('/users/:id (DELETE)', () => {
    return request(app.getHttpServer()).delete('/users/1').expect(200);
  });
});
