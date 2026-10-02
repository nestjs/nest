import { Module } from '../../decorators/modules/module.decorator.js';
import { ConfigurableModuleBuilder } from '../../module-utils/configurable-module.builder.js';
import { Test } from '../../../testing/test.js';

describe('ConfigurableModuleBuilder alias dependencies', () => {
  it('compiles a module with an alias supplied through provideInjectionTokensFrom', async () => {
    const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
      new ConfigurableModuleBuilder<{ text: string }>().build();
    class Feature extends ConfigurableModuleClass {}
    Module({})(Feature);

    const definition = Feature.registerAsync({
      useFactory: text => ({ text }),
      inject: ['alias'],
      provideInjectionTokensFrom: [
        { provide: 'alias', useExisting: 'source' },
        { provide: 'source', useFactory: value => value, inject: ['leaf'] },
        { provide: 'leaf', useValue: 'ok' },
      ],
    });
    const module = await Test.createTestingModule({
      imports: [definition],
    }).compile();
    try {
      expect(module.get(MODULE_OPTIONS_TOKEN)).toEqual({ text: 'ok' });
    } finally {
      await module.close();
    }
  });
});
