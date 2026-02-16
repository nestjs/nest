import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Serializer (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return serialized user with password excluded', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return user with fullName exposed', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('fullName', 'Kamil Mysliwiec');
        });
    });

    it('should transform role to string', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('role', 'admin');
          expect(typeof res.body.role).toBe('string');
        });
    });

    it('should include id, firstName, and lastName', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 1);
          expect(res.body).toHaveProperty('firstName', 'Kamil');
          expect(res.body).toHaveProperty('lastName', 'Mysliwiec');
        });
    });

    it('should return correct serialized shape', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            id: 1,
            firstName: 'Kamil',
            lastName: 'Mysliwiec',
            fullName: 'Kamil Mysliwiec',
            role: 'admin',
          });
        });
    });
  });
});
