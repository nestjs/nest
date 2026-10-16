import {
  CanActivate,
  Controller,
  Get,
  Inject,
  INestApplication,
  Injectable,
  Scope,
  UseGuards,
} from '@nestjs/common';
import { ModuleRef, REQUEST } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

@Injectable({ scope: Scope.REQUEST })
class Session {
  constructor(
    @Inject(REQUEST)
    private readonly request: { headers: Record<string, string> },
  ) {}

  isMember() {
    return this.request.headers['x-member'] === 'true';
  }
}

// Request-scoped only through its dependency.
@Injectable()
class MembersGuard implements CanActivate {
  constructor(private readonly session: Session) {}

  // An instance property, so a guard whose constructor never ran has none.
  canActivate = () => this.session.isMember();
}

// Hosts its handlers the way a gateway or a GraphQL resolver does.
@Injectable()
class VaultHandlers {
  @UseGuards(MembersGuard)
  open() {
    return 'vault';
  }
}

@Controller('vault')
class VaultController {
  @UseGuards(MembersGuard)
  @Get()
  open() {
    return 'vault';
  }
}

describe('Enhancers request-scoped through their dependencies', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VaultController],
      providers: [Session, VaultHandlers],
    }).compile();
    app = await listenOnLoopback(moduleRef.createNestApplication());
  });

  afterEach(async () => {
    await app.close();
  });

  it('should make the provider that hosts them request-scoped', () => {
    expect(app.get(ModuleRef).introspect(VaultHandlers).scope).toBe(
      Scope.REQUEST,
    );
  });

  it('should run them on a controller that shares them with that provider', async () => {
    await request(app.getHttpServer()).get('/vault').expect(403);
    await request(app.getHttpServer())
      .get('/vault')
      .set('x-member', 'true')
      .expect(200, 'vault');
  });
});
