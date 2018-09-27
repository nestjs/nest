import { injectable } from 'inversify';

import { PROVIDER_METADATA } from '../constants';

export function Injectable(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(PROVIDER_METADATA, true, target);

    injectable()(<any>target);
  };
}
