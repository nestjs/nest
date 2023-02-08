export class DeterministicUuidRegistry {
  private static readonly registry = new Map<string, boolean>();

  static get(str: string, inc = 0) {
    const id = inc ? this.hashCode(`${str}_${inc}`) : this.hashCode(str);
    if (this.registry.has(id)) {
      return this.get(str, inc + 1);
    }
    this.registry.set(id, true);
    return id;
  }

  static clear() {
    this.registry.clear();
  }

  private static hashCode(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h.toString();
  }
}
