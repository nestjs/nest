import { v5 as uuid } from 'uuid';

const DEFAULT_UUID_NAMESPACE = 'efa0df42-88af-474f-9cad-4206a2319f07';

export class DeterministicUuidRegistry {
  private static readonly registry = new Set<string>();

  static get(str: string, namespace: string = DEFAULT_UUID_NAMESPACE, inc = 0) {
    const id = inc ? uuid(str + `${inc}`, namespace) : uuid(str, namespace);
    if (this.registry.has(id)) {
      return this.get(str, namespace, inc + 1);
    }
    this.registry.add(id);
    return id;
  }

  static clear() {
    this.registry.clear();
  }
}
