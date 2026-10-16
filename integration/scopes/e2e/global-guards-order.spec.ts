import {
  CanActivate,
  Controller,
  Get,
  INestApplication,
  Injectable,
  Scope,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const calls: string[] = [];

function createGuard(name: string, scope: Scope) {
  @Injectable({ scope })
  class OrderGuard implements CanActivate {
    canActivate() {
      calls.push(name);
      return true;
    }
  }
  return OrderGuard;
}

@Controller('guards')
class GuardsController {
  @Get()
  getCalls() {
    return calls;
  }
}

const scopes = {
  DEFAULT: Scope.DEFAULT,
  REQUEST: Scope.REQUEST,
  TRANSIENT: Scope.TRANSIENT,
};
type ScopeName = keyof typeof scopes;
const scopeNames = Object.keys(scopes) as ScopeName[];

describe('Global guards order', () => {
  let app: INestApplication;

  afterEach(async () => {
    calls.length = 0;
    await app.close();
  });

  it.each(
    scopeNames.flatMap(first => scopeNames.map(second => [first, second])),
  )(
    'should run %s and %s scoped APP_GUARD providers in binding order',
    async (first, second) => {
      const moduleRef = await Test.createTestingModule({
        controllers: [GuardsController],
        providers: [
          { provide: APP_GUARD, useClass: createGuard('first', scopes[first]) },
          {
            provide: APP_GUARD,
            useClass: createGuard('second', scopes[second]),
          },
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      // Bound after the APP_GUARD providers, so it runs after them
      app.useGlobalGuards(new (createGuard('third', Scope.DEFAULT))());
      await app.init();

      await request(app.getHttpServer())
        .get('/guards')
        .expect(200, ['first', 'second', 'third']);
    },
  );
});
