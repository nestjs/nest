import { expect } from 'chai';
import { ModulesContainer, NestContainer } from '../../injector';
import { Module } from '../../injector/module';
import { Routes } from '../../router/interfaces';
import {
  RouterModule,
  ROUTES,
  targetModulesByContainer,
} from '../../router/router-module';

class TestModuleClass {}

describe('RouterModule', () => {
  const routes: Routes = [{ path: 'test', module: TestModuleClass }];

  describe('register', () => {
    it('should return a dynamic module with routes registered as a provider', () => {
      expect(RouterModule.register(routes)).to.deep.equal({
        module: RouterModule,
        providers: [
          {
            provide: ROUTES,
            useValue: routes,
          },
        ],
      });
    });
  });
  describe('when instantiated', () => {
    it('should update the "targetModulesByContainer" weak map', () => {
      const moduleRef = new Module(TestModuleClass, new NestContainer(null!));
      const container = new ModulesContainer([
        [TestModuleClass.name, moduleRef],
      ]);

      new RouterModule(container, routes);

      class NotRegisteredModuleClass {}

      new RouterModule(container, [
        {
          path: 'random',
          module: NotRegisteredModuleClass,
        },
      ]);

      expect(targetModulesByContainer.get(container)!.has(moduleRef)).to.be
        .true;
    });
  });
});
