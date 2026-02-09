import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants.js';
import { Type } from '@nestjs/common/interfaces/type.interface.js';

export function isDurable(provider: Type<unknown>): boolean | undefined {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.durable;
}
