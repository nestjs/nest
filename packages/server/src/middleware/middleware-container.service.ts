import { Injectable, Type } from '@nest/core';

import { MiddlewareConfiguration, MiddlewareWrapper } from '../interfaces';

@Injectable()
export class MiddlewareContainer {
  private readonly middleware = new Map<
    string,
    Map<string, MiddlewareWrapper>
  >();
  private readonly configurations = new Map<
    string,
    Set<MiddlewareConfiguration>
  >();

  public addConfig(
    configList: MiddlewareConfiguration[] = [],
    controllers: Type<any>[],
  ) {}

  public getConfigs() {
    return this.configurations;
  }

  public getMiddleware() {}

  private getCurrentMiddleware() {}

  private getCurrentConfig() {}
}
