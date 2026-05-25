import {
  INestApplication,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

@Injectable()
export class AuthGuard {
  canActivate() {
    const x = true;
    if (x) {
      throw new UnauthorizedException();
    }
  }
}

function createTestModule(guard) {
  return Test.createTestingModule({
    imports: [AppModule],
    providers: [
      {
        provide: APP_GUARD,
        useValue: guard,
      },
    ],
  }).compile();
}

describe('Guards', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it(`should prevent access (unauthorized)`, async () => {
    app = (await createTestModule(new AuthGuard())).createNestApplication();

    await app.init();
    return request(app.getHttpServer())
      .get('/hello')
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Unauthorized');
        expect(body.statusCode).toBe(401);
      });
  });

  it(`should allow access when guard returns true`, async () => {
    const allowGuard = { canActivate: () => true };
    app = (await createTestModule(allowGuard)).createNestApplication();

    await app.init();
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200)
      .expect('Hello world!');
  });
});
