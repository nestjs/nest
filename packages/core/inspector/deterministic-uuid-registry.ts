import { createHash } from 'crypto';

export class DeterministicUuidRegistry {
  private static readonly registry = new Map<string, boolean>();

  static get(str: string, namespace: string = '', inc = 0) {
    const key = inc ? `${str}_${inc}` : str;

    if (this.registry.has(key)) {
      return this.get(str, namespace, inc + 1);
    }

    const id = createHash('sha256').update(key).digest('hex');

    this.registry.set(id, true);

    return id;
  }

  static clear() {
    this.registry.clear();
  }
}
