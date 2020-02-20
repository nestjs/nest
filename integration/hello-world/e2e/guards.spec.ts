import {
  INestApplication,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';

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

  it(`should prevent access (unauthorized)`, async () => {
    app = (await createTestModule(new AuthGuard())).createNestApplication();

    await app.init();
    return request(app.getHttpServer())
      .get('/hello')
      .expect(401);
  });
});
