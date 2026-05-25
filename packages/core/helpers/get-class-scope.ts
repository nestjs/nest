import type { Scope } from '@nestjs/common';
import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/internal';
import type { Type } from '@nestjs/common';

export function getClassScope(provider: Type<unknown>): Scope {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.scope;
}
