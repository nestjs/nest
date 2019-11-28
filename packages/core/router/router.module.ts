import { Module, DynamicModule } from '@nestjs/common';
import { validatePath } from '@nestjs/common/utils/shared.utils';
import { MODULE_PATH } from '@nestjs/common/constants';
import { Routes } from './interfaces/routes.interface';
import { flatRoutes } from './utils/flat-routes.util';

/**
 * A Utility Module to Organize your Routes,
 *
 * @publicApi
 */
@Module({})
export class RouterModule {
  /**
   * takes an array of modules and organize them in hierarchy way
   * @param {Routes} routes Array of Routes
   * @publicapi
   */
  static register(routes: Routes): DynamicModule {
    RouterModule.buildPathMap(routes);
    return {
      module: RouterModule,
    };
  }

  private static buildPathMap(routes: Routes) {
    const flattenRoutes = flatRoutes(routes);
    flattenRoutes.forEach(route => {
      Reflect.defineMetadata(
        MODULE_PATH,
        validatePath(route.path),
        route.module,
      );
    });
  }
}
