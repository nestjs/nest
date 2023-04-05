import { Type } from '@nestjs/common';

export class InitializeOnPreviewAllowlist {
  private static readonly allowlist = new WeakMap<Type, boolean>();

  public static add(type: Type) {
    this.allowlist.set(type, true);
  }

  public static has(type: Type) {
    return this.allowlist.has(type);
  }
}
