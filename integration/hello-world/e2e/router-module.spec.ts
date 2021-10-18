import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

describe('RouterModule', () => {
  let app: INestApplication;

  abstract class BaseController {
    @Get()
    getName() {
      return this.constructor.name;
    }
  }

  @Controller('/parent-controller')
  class ParentController extends BaseController {}
  @Controller('/child-controller')
  class ChildController extends BaseController {}
  @Controller('no-slash-controller')
  class NoSlashController extends BaseController {}

  class UnknownController {}
  @Module({ controllers: [ParentController] })
  class ParentModule {}

  @Module({ controllers: [ChildController] })
  class ChildModule {}

  @Module({})
  class AuthModule {}
  @Module({})
  class PaymentsModule {}

  @Module({ controllers: [NoSlashController] })
  class NoSlashModule {}

  const routes1: Routes = [
    {
      path: 'parent',
      module: ParentModule,
      children: [
        {
          path: 'child',
          module: ChildModule,
        },
      ],
    },
  ];
  const routes2: Routes = [
    { path: 'v1', children: [AuthModule, PaymentsModule, NoSlashModule] },
  ];

  @Module({
    imports: [ParentModule, ChildModule, RouterModule.register(routes1)],
  })
  class MainModule {}

  @Module({
    imports: [
      AuthModule,
      PaymentsModule,
      NoSlashModule,
      RouterModule.register(routes2),
    ],
  })
  class AppModule {}

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MainModule, AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('should hit the "ParentController"', async () => {
    return request(app.getHttpServer())
      .get('/parent/parent-controller')
      .expect(200, 'ParentController');
  });

  it('should hit the "ChildController"', async () => {
    return request(app.getHttpServer())
      .get('/parent/child/child-controller')
      .expect(200, 'ChildController');
  });

  it('should hit the "NoSlashController"', async () => {
    return request(app.getHttpServer())
      .get('/v1/no-slash-controller')
      .expect(200, 'NoSlashController');
  });

  afterEach(async () => {
    await app.close();
  });
});
