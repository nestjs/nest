import { Module, DynamicModule } from '@nestjs/common';
import { validatePath } from '@nestjs/common/utils/shared.utils';
import { MODULE_PATH, PATH_METADATA } from '@nestjs/common/constants';
import { Controller, Type } from '@nestjs/common/interfaces';
import { Routes } from './interfaces/routes.interface';
import { flatRoutes } from './utils/flat-routes.util';
import { ModulesContainer } from '../injector';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';

/**
 * A Utility Module to Organize your Routes,
 *
 * @publicApi
 */
@Module({})
export class RouterModule {
  // A HashMap between the route path and it's module path.
  private static readonly routesContainer: Map<string, string> = new Map();
  constructor(readonly modulesContainer: ModulesContainer) {
    const modules = [...modulesContainer.values()];
    for (const nestModule of modules) {
      const modulePath: string = Reflect.getMetadata(
        MODULE_PATH,
        nestModule.metatype,
      );
      for (const route of nestModule.routes.values()) {
        RouterModule.routesContainer.set(route.name, validatePath(modulePath));
      }
    }
  }

  /**
   * Takes an array of modules and organize them in hierarchy way
   * @param {Routes} routes Array of Routes
   * @publicapi
   */
  static register(routes: Routes): DynamicModule {
    RouterModule.buildPathMap(routes);
    return {
      module: RouterModule,
    };
  }

  /**
   * Get the controller full route path eg: (controller's module prefix + controller's path).
   *
   * @param {Type<Controller>} controller the controller you need to get it's full path
   */
  public static resolvePath(controller: Type<Controller>): string {
    const controllerPath: string = Reflect.getMetadata(
      PATH_METADATA,
      controller,
    );
    const modulePath = RouterModule.routesContainer.get(controller.name);
    if (modulePath && controllerPath) {
      return validatePath(modulePath + validatePath(controllerPath));
    } else {
      throw new UnknownElementException(controller.name);
    }
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
