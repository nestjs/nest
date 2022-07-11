import {
  ClassProvider,
  FactoryProvider,
  Provider,
  ValueProvider,
} from '@nestjs/common';
import { isUndefined } from '@nestjs/common/utils/shared.utils';

export function isClassProvider(provider: Provider): boolean {
  return Boolean((provider as ClassProvider)?.useClass);
}

export function isValueProvider(provider: Provider): boolean {
  const providerValue = (provider as ValueProvider)?.useValue;
  return !isUndefined(providerValue);
}

export function isFactoryProvider(provider: Provider): boolean {
  return Boolean((provider as FactoryProvider).useFactory);
}
