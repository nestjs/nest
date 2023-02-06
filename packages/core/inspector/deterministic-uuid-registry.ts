import { xxh32 } from '@node-rs/xxhash';

const DEFAULT_UUID_NAMESPACE = 'efa0df42-88af-474f-9cad-4206a2319f07';

export class DeterministicUuidRegistry {
  private static readonly registry = new Set<string>();

  static get(str: string, namespace: string = DEFAULT_UUID_NAMESPACE, inc = 0) {
    const id = inc
      ? xxh32(`${namespace}_${str}_${inc}`)
      : xxh32(`${namespace}_${str}`);
    const idAsString = `${id}`;

    if (this.registry.has(idAsString)) {
      return this.get(str, namespace, inc + 1);
    }
    this.registry.add(idAsString);
    return idAsString;
  }

  static clear() {
    this.registry.clear();
  }
}
