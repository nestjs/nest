import { RouterModule } from '../../router/router.module';
import { Module, Controller } from '@nestjs/common';
import { MODULE_PATH } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Routes } from '../../router/interfaces/routes.interface';
import { expect } from 'chai';

describe('RouterModule', () => {
  let app: INestApplication;

  @Controller('/parent-controller')
  class ParentController {}
  @Controller('/child-controller')
  class ChildController {}
  @Controller('no-slash-controller')
  class NoSlashController {}

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
  it('should add Path Metadata to all Routes', () => {
    const parentPath = Reflect.getMetadata(MODULE_PATH, ParentModule);
    const childPath = Reflect.getMetadata(MODULE_PATH, ChildModule);
    expect(parentPath).to.be.equal('/parent');
    expect(childPath).to.be.equal('/parent/child');
  });

  it('should add paths even we omitted the module key', () => {
    const authPath = Reflect.getMetadata(MODULE_PATH, AuthModule);
    const paymentPath = Reflect.getMetadata(MODULE_PATH, PaymentsModule);
    expect(authPath).to.be.equal('/v1');
    expect(paymentPath).to.be.equal('/v1');
  });

  describe('Full Running App', async () => {
    before(async () => {
      const module = await Test.createTestingModule({
        imports: [MainModule, AppModule],
      }).compile();
      app = module.createNestApplication();
    });

    it('should Resolve Controllers path with its Module Path if any', async () => {
      expect(RouterModule.resolvePath(ParentController)).to.be.equal(
        '/parent/parent-controller',
      );
      expect(RouterModule.resolvePath(ChildController)).to.be.equal(
        '/parent/child/child-controller',
      );
    });

    it('should throw error when we cannot find the controller', async () => {
      expect(() => RouterModule.resolvePath(UnknownController)).throw(
        'Nest could not find UnknownController element (this provider does not exist in the current context)',
      );
    });

    it('should resolve controllers path concatinated with its module path correctly', async () => {
      expect(RouterModule.resolvePath(NoSlashController)).to.be.equal(
        '/v1/no-slash-controller',
      );
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
