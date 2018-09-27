import { inject } from 'inversify';

import { ForwardRef, Token, Dependency, TLazyInject } from '../interfaces';
import { Registry } from '../registry';

export function createLazyInjection(target: object, property: string) {
  return (lazyInject: TLazyInject, provider: Token) => {
    Registry.assertProvider(provider);

    lazyInject(provider)(target, property);
  };
}

export function Inject(provider: Dependency) {
  return (target: object, property: string) => {
    if (!Registry.hasForwardRef(provider)) {
      Registry.assertProvider(provider, target.constructor.name);

      const token = Registry.getInjectionToken(<Token>provider);
      return inject(<any>token)(target, property);
    }

    Registry.lazyInjects.add({
      target: target.constructor,
      forwardRef: <ForwardRef>provider,
      lazyInject: createLazyInjection(target, property),
    });
  };
}
