export class InjectionToken<T> {
  public readonly name = Symbol.for(`InjectionToken<${this.desc}>`);

  constructor(private readonly desc: string) {}
}
