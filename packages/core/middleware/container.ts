import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { NestMiddleware } from '@nestjs/common/interfaces/middleware/nest-middleware.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';

export class MiddlewareContainer {
  private readonly middleware = new Map<
    string,
    Map<string, MiddlewareWrapper>
  >();
  private readonly configurationSets = new Map<
    string,
    Set<MiddlewareConfiguration>
  >();

  public getMiddleware(module: string): Map<string, MiddlewareWrapper> {
    return this.middleware.get(module) || new Map();
  }

  public getConfigs(): Map<string, Set<MiddlewareConfiguration>> {
    return this.configurationSets;
  }

  public addConfig(configList: MiddlewareConfiguration[], module: string) {
    const middleware = this.getCurrentMiddleware(module);
    const currentConfig = this.getCurrentConfig(module);

    const configurations = configList || [];
    configurations.map(config => {
      [].concat(config.middleware).map(metatype => {
        const token = metatype.name;
        middleware.set(token, {
          instance: null,
          metatype,
        });
      });
      currentConfig.add(config);
    });
  }

  private getCurrentMiddleware(module: string) {
    if (!this.middleware.has(module)) {
      this.middleware.set(module, new Map<string, MiddlewareWrapper>());
    }
    return this.middleware.get(module);
  }

  private getCurrentConfig(module: string) {
    if (!this.configurationSets.has(module)) {
      this.configurationSets.set(module, new Set<MiddlewareConfiguration>());
    }
    return this.configurationSets.get(module);
  }
}

export interface MiddlewareWrapper {
  instance: NestMiddleware;
  metatype: Type<NestMiddleware>;
}
