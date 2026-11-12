import {
  CanActivate,
  Controller,
  Get,
  INestApplication,
  Injectable,
  mixin,
  Type,
  UseGuards,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InvalidEnhancerException } from '@nestjs/core/errors/exceptions/invalid-enhancer.exception.js';
import { Test } from '@nestjs/testing';

// An abstract class used as a DI token, with the implementation provided
// under it: what `@UseGuards()` gets is the abstract class itself.
abstract class AuthGuard implements CanActivate {
  abstract canActivate(): boolean;
}

@Injectable()
class TokenAuthGuard extends AuthGuard {
  canActivate() {
    return false;
  }
}

function RoleGuard(role: string): Type<CanActivate> {
  class RoleGuardMixin implements CanActivate {
    canActivate() {
      return role === 'none';
    }
  }
  return mixin(RoleGuardMixin);
}

@Controller()
class SecretController {
  @UseGuards(AuthGuard)
  @Get('secret')
  secret() {
    return 'secret';
  }
}

@Controller()
class OpenController {
  @Get('open')
  open() {
    return 'open';
  }
}

describe('Enhancers that are not enhancers', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('should fail to start when a guard bound with @UseGuards() has no "canActivate"', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SecretController],
      providers: [{ provide: AuthGuard, useClass: TokenAuthGuard }],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });

    await expect(app.init()).rejects.toThrow(InvalidEnhancerException);
  });

  it('should fail to start when APP_GUARD gives a guard class instead of an instance', async () => {
    await expect(
      Test.createTestingModule({
        controllers: [OpenController],
        providers: [{ provide: APP_GUARD, useValue: RoleGuard('admin') }],
      }).compile(),
    ).rejects.toThrow(/APP_GUARD provider \(useValue\) gives class/);
  });

  it('should throw when useGlobalGuards() is given a guard class', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OpenController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });

    expect(() => app!.useGlobalGuards(TokenAuthGuard as any)).toThrow(
      /The guard \(class TokenAuthGuard\) doesn't provide the "canActivate" method/,
    );
  });
});
