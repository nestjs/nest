import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { NestMiddleware } from '@nestjs/common/interfaces/middlewares/nest-middleware.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';

export class MiddlewaresContainer {
  private readonly middlewares = new Map<
    string,
    Map<string, MiddlewareWrapper>
  >();
  private readonly configs = new Map<string, Set<MiddlewareConfiguration>>();

  public getMiddlewares(module: string): Map<string, MiddlewareWrapper> {
    return this.middlewares.get(module) || new Map();
  }

  public getConfigs(): Map<string, Set<MiddlewareConfiguration>> {
    return this.configs;
  }

  public addConfig(configList: MiddlewareConfiguration[], module: string) {
    const middlewares = this.getCurrentMiddlewares(module);
    const currentConfig = this.getCurrentConfig(module);

    const configurations = configList || [];
    configurations.map(config => {
      [].concat(config.middlewares).map(metatype => {
        const token = metatype.name;
        middlewares.set(token, {
          instance: null,
          metatype,
        });
      });
      currentConfig.add(config);
    });
  }

  private getCurrentMiddlewares(module: string) {
    if (!this.middlewares.has(module)) {
      this.middlewares.set(module, new Map<string, MiddlewareWrapper>());
    }
    return this.middlewares.get(module);
  }

  private getCurrentConfig(module: string) {
    if (!this.configs.has(module)) {
      this.configs.set(module, new Set<MiddlewareConfiguration>());
    }
    return this.configs.get(module);
  }
}

export interface MiddlewareWrapper {
  instance: NestMiddleware;
  metatype: Type<NestMiddleware>;
}
