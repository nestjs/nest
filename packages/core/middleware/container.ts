import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { InstanceWrapper } from './../injector/instance-wrapper';

export class MiddlewareContainer {
  private readonly middleware = new Map<string, Map<string, InstanceWrapper>>();
  private readonly configurationSets = new Map<
    string,
    Set<MiddlewareConfiguration>
  >();

  public getMiddleware(module: string): Map<string, InstanceWrapper> {
    return this.middleware.get(module) || new Map();
  }

  public getConfigs(): Map<string, Set<MiddlewareConfiguration>> {
    return this.configurationSets;
  }

  public addConfig(configList: MiddlewareConfiguration[], module: string) {
    const middleware = this.getCurrentMiddleware(module);
    const targetConfig = this.getCurrentConfig(module);

    const configurations = configList || [];
    configurations.forEach(config => {
      const callback = metatype => {
        const token = metatype.name;
        middleware.set(
          token,
          new InstanceWrapper({
            instance: null,
            metatype,
          }),
        );
      };
      [].concat(config.middleware).map(callback);
      targetConfig.add(config);
    });
  }

  private getCurrentMiddleware(module: string) {
    if (!this.middleware.has(module)) {
      this.middleware.set(module, new Map<string, InstanceWrapper>());
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
