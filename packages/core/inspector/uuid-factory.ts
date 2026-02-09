import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util.js';
import { DeterministicUuidRegistry } from './deterministic-uuid-registry.js';

export enum UuidFactoryMode {
  Random = 'random',
  Deterministic = 'deterministic',
}

export class UuidFactory {
  private static _mode = UuidFactoryMode.Random;

  static set mode(value: UuidFactoryMode) {
    this._mode = value;
  }

  static get(key = '') {
    return this._mode === UuidFactoryMode.Deterministic
      ? DeterministicUuidRegistry.get(key)
      : randomStringGenerator();
  }
}
