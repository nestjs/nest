import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';

@Controller('users')
class UsersController {
  @Get(':id')
  findOne() {
    return 'findOne';
  }

  @Get('me')
  findMe() {
    return 'findMe';
  }
}

@Module({
  controllers: [UsersController],
})
class AppModule {}

describe('Route conflict detection', () => {
  it('should keep route conflict detection off by default', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();

    await app.init();
    await request(app.getHttpServer()).get('/users/me').expect(200, 'findOne');
    await app.close();
  });

  it('should throw during bootstrap when error policy is enabled', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.enableRouteConflictDetection({ policy: 'error' });

    try {
      await app.init();
      throw new Error('Expected app.init() to throw');
    } catch (err) {
      expect((err as Error).message).to.contain(
        'GET /users/:id (UsersController.findOne) may shadow GET /users/me (UsersController.findMe)',
      );
    } finally {
      await app.close();
    }
  });
});
