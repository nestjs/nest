import { BaseMetadataStorage, Type } from '@nest/core';

import { EventMetadata, WindowMetadata } from './interfaces';

export class MetadataStorage extends BaseMetadataStorage {
  public static readonly windows = new Set<WindowMetadata>();
  public static readonly events = new Set<EventMetadata>();

  public static getWindowByType(target: Type<any> | Function) {
    return this.findByTarget<WindowMetadata>(this.windows, target);
  }

  public static getEventsByType(target: Type<any> | Function) {
    return this.filterByTarget<EventMetadata>(this.events, target);
  }
}
