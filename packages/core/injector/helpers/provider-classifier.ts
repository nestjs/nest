import { ClassProvider, Provider, ValueProvider } from '@nestjs/common';

export function isClassProvider(provider: Provider): boolean {
  return Boolean((provider as ClassProvider)?.useClass);
}

export function isValueProvider(provider: Provider): boolean {
  return Boolean((provider as ValueProvider)?.useValue);
}
