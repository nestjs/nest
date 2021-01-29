import { DynamicModule, Inject, Module, Type } from '@nestjs/common';
import { MODULE_PATH } from '@nestjs/common/constants';
import { normalizePath } from '@nestjs/common/utils/shared.utils';
import { ModulesContainer } from '../injector';
import { Module as ModuleClass } from '../injector/module';
import { Routes } from './interfaces';
import { flattenRoutePaths } from './utils';

export const ROUTES = Symbol('ROUTES');

export const targetModulesByContainer = new WeakMap<
  ModulesContainer,
  WeakSet<ModuleClass>
>();

/**
 * @publicApi
 */
@Module({})
export class RouterModule {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    @Inject(ROUTES) private readonly routes: Routes,
  ) {
    this.initialize();
  }

  static register(routes: Routes): DynamicModule {
    return {
      module: RouterModule,
      providers: [
        {
          provide: ROUTES,
          useValue: routes,
        },
      ],
    };
  }

  private initialize() {
    const flattenedRoutes = flattenRoutePaths(this.routes);
    flattenedRoutes.forEach(route => {
      const modulePath = normalizePath(route.path);
      this.registerModulePathMetadata(route.module, modulePath);
      this.updateTargetModulesCache(route.module);
    });
  }

  private registerModulePathMetadata(
    moduleCtor: Type<unknown>,
    modulePath: string,
  ) {
    Reflect.defineMetadata(
      MODULE_PATH + this.modulesContainer.applicationId,
      modulePath,
      moduleCtor,
    );
  }

  private updateTargetModulesCache(moduleCtor: Type<unknown>) {
    let moduleClassSet: WeakSet<ModuleClass>;
    if (targetModulesByContainer.has(this.modulesContainer)) {
      moduleClassSet = targetModulesByContainer.get(this.modulesContainer);
    } else {
      moduleClassSet = new WeakSet<ModuleClass>();
      targetModulesByContainer.set(this.modulesContainer, moduleClassSet);
    }
    const moduleRef = Array.from(this.modulesContainer.values()).find(
      item => item?.metatype === moduleCtor,
    );
    if (!moduleRef) {
      return;
    }
    moduleClassSet.add(moduleRef);
  }
}
