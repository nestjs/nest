import { Provider } from '../interfaces';
import { ConfigurableModuleBuilder } from '../module-utils';
import { HttpModuleOptions } from './interfaces';

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  initialize,
} = new ConfigurableModuleBuilder<HttpModuleOptions>({
  moduleName: 'Http',
  alwaysTransient: true,
})
  .setFactoryMethodName('createHttpOptions')
  .setExtras<{ extraProviders?: Provider[] }>(
    {
      extraProviders: [],
    },
    (definition, extras) => ({
      ...definition,
      providers: definition.providers.concat(extras?.extraProviders),
    }),
  )
  .build();
