import { TargetRef, Type, Provider, TargetPropertyRef } from './interfaces';
import { Utils } from './util';

export type Target = Type<Provider> | Function;

export class BaseMetadataStorage {
  protected static findByTarget<T extends TargetRef>(
    metadata: Set<T>,
    target: Target,
  ): T | undefined {
    return [...metadata.values()].find(value => value.target === target);
  }

  protected static findByTargetProperty<T extends TargetPropertyRef>(
    metadata: Set<T>,
    target: Target,
    propertyKey?: string | symbol,
  ): T | undefined {
    const findByProperty = () => {
      return [...metadata.values()].find(
        value => value.target === target && value.propertyKey === propertyKey,
      );
    };

    return Utils.isNil(propertyKey)
      ? this.findByTarget(metadata, target)
      : findByProperty();
  }

  protected static filterByTargetProperty<T extends TargetPropertyRef>(
    metadata: Set<T>,
    target: Target,
    propertyKey?: string | symbol,
  ): T[] {
    const filterByProperty = () => {
      return [...metadata.values()].filter(
        value => value.target === target && value.propertyKey === propertyKey,
      );
    };

    return Utils.isNil(propertyKey)
      ? this.filterByTarget(metadata, target)
      : filterByProperty();
  }

  protected static filterByTarget<T extends TargetRef>(
    metadata: Set<T>,
    target: Target,
  ): T[] {
    return [...metadata.values()].filter(value => value.target === target);
  }
}
