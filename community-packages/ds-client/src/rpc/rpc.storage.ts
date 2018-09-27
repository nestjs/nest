import { BaseMetadataStorage, Type } from '@nest/core';

import { EventProvider } from './interfaces';

export class RpcStorage extends BaseMetadataStorage {
  public static readonly eventProviders = new Set<EventProvider>();

  public static getEventProvidersByType(target: Type<any> | Function) {
    return this.filterByTarget<EventProvider>(this.eventProviders, target);
  }
}
