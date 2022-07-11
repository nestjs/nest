import {
  ClassProvider,
  FactoryProvider,
  Provider,
  ValueProvider,
} from '@nestjs/common';

export function isClassProvider(provider: Provider): boolean {
  return Boolean((provider as ClassProvider)?.useClass);
}

export function isValueProvider(provider: Provider): boolean {
  return Boolean((provider as ValueProvider)?.useValue);
}

export function isFactoryProvider(provider: Provider): boolean {
  return Boolean((provider as FactoryProvider).useFactory);
}
