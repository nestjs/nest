import { Dependency } from '@nest/core';

export interface OverrideByFactoryOptions {
  factory: (...args) => any;
  inject?: Dependency[];
}
