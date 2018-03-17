import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApplicationModule } from './../src/app.module';
import { APP_GUARD } from '@nestjs/core';

@Injectable()
export class Guard {
  canActivate() {
    return false;
  }
}

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
    imports: [ApplicationModule],
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

  it(`should prevent access (forbidden)`, async () => {
    app = (await createTestModule(
      new Guard(),
    )).createNestApplication();
  
    await app.init();
    return request(app.getHttpServer())
      .get('/hello')
      .expect(403);
  });

  it(`should prevent access (unauthorized)`, async () => {
    app = (await createTestModule(
      new AuthGuard(),
    )).createNestApplication();
  
    await app.init();
    return request(app.getHttpServer())
      .get('/hello')
      .expect(401);
  });
});
