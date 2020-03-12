import { Scope, Type } from '@nestjs/common';
import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { NestContainer } from '../injector';
import { InstanceWrapper } from '../injector/instance-wrapper';

export class MiddlewareContainer {
  private readonly middleware = new Map<string, Map<string, InstanceWrapper>>();
  private readonly configurationSets = new Map<
    string,
    Set<MiddlewareConfiguration>
  >();

  constructor(private readonly container: NestContainer) {}

  public getMiddlewareCollection(
    moduleKey: string,
  ): Map<string, InstanceWrapper> {
    if (!this.middleware.has(moduleKey)) {
      const moduleRef = this.container.getModuleByKey(moduleKey);
      this.middleware.set(moduleKey, moduleRef.middlewares);
    }
    return this.middleware.get(moduleKey);
  }

  public getConfigurations(): Map<string, Set<MiddlewareConfiguration>> {
    return this.configurationSets;
  }

  public insertConfig(
    configList: MiddlewareConfiguration[],
    moduleKey: string,
  ) {
    const middleware = this.getMiddlewareCollection(moduleKey);
    const targetConfig = this.getTargetConfig(moduleKey);

    const configurations = configList || [];
    const insertMiddleware = <T extends Type<unknown>>(metatype: T) => {
      const token = metatype.name;
      middleware.set(
        token,
        new InstanceWrapper({
          scope: this.getClassScope(metatype),
          metatype,
          name: token,
        }),
      );
    };
    configurations.forEach(config => {
      [].concat(config.middleware).map(insertMiddleware);
      targetConfig.add(config);
    });
  }

  private getTargetConfig(moduleName: string) {
    if (!this.configurationSets.has(moduleName)) {
      this.configurationSets.set(
        moduleName,
        new Set<MiddlewareConfiguration>(),
      );
    }
    return this.configurationSets.get(moduleName);
  }

  private getClassScope<T = unknown>(type: Type<T>): Scope {
    const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type);
    return metadata && metadata.scope;
  }
}
