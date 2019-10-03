import { Scope, Type } from '@nestjs/common';
import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { InstanceWrapper } from '../injector/instance-wrapper';

export class MiddlewareContainer {
  private readonly middleware = new Map<string, Map<string, InstanceWrapper>>();
  private readonly configurationSets = new Map<
    string,
    Set<MiddlewareConfiguration>
  >();

  public getMiddlewareCollection(module: string): Map<string, InstanceWrapper> {
    return this.middleware.get(module) || new Map();
  }

  public getConfigurations(): Map<string, Set<MiddlewareConfiguration>> {
    return this.configurationSets;
  }

  public insertConfig(configList: MiddlewareConfiguration[], module: string) {
    const middleware = this.getTargetMiddleware(module);
    const targetConfig = this.getTargetConfig(module);

    const configurations = configList || [];
    const insertMiddleware = <T extends Type<any>>(metatype: T) => {
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

  private getTargetMiddleware(module: string) {
    if (!this.middleware.has(module)) {
      this.middleware.set(module, new Map<string, InstanceWrapper>());
    }
    return this.middleware.get(module);
  }

  private getTargetConfig(module: string) {
    if (!this.configurationSets.has(module)) {
      this.configurationSets.set(module, new Set<MiddlewareConfiguration>());
    }
    return this.configurationSets.get(module);
  }

  private getClassScope<T = any>(type: Type<T>): Scope {
    const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, type);
    return metadata && metadata.scope;
  }
}
