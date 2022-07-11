import { ClassProvider, Provider } from '@nestjs/common';

export function isClassProvider(provider: Provider): boolean {
  return Boolean((provider as ClassProvider)?.useClass);
}
