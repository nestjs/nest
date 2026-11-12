export class DeterministicUuidRegistry {
  private static readonly registry = new Map<string, boolean>();
  /**
   * The next suffix to try for a given string. The ids of the smaller ones
   * are all taken, and stay taken until `clear()`, so they need not be
   * probed again on every call.
   */
  private static readonly nextIncrements = new Map<string, number>();

  static get(str: string, inc = 0) {
    inc = Math.max(inc, this.nextIncrements.get(str) ?? 0);

    let id = inc ? this.hashCode(`${str}_${inc}`) : this.hashCode(str);
    while (this.registry.has(id)) {
      id = this.hashCode(`${str}_${++inc}`);
    }
    this.registry.set(id, true);
    this.nextIncrements.set(str, inc + 1);
    return id;
  }

  static clear() {
    this.registry.clear();
    this.nextIncrements.clear();
  }

  private static hashCode(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h.toString();
  }
}
