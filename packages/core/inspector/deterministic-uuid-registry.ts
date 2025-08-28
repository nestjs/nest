export class DeterministicUuidRegistry {
  private static readonly registry = new Map<string, boolean>();

  static get(str: string) {
    let id = this.hashCode(str);
    let inc = 0;
    while (this.registry.has(id)) {
      id = this.hashCode(`${str}_${++inc}`);
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
