import { ConfigurableModuleBuilder, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IntegrationModule } from '../src/integration.module.js';

describe('Module utils (ConfigurableModuleBuilder)', () => {
  it('should auto-generate "forRoot" method', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        IntegrationModule.forRoot({
          isGlobal: true,
          url: 'test_url',
          secure: false,
        }),
      ],
    }).compile();

    const integrationModule = moduleRef.get(IntegrationModule);

    expect(integrationModule.options).toEqual({
      url: 'test_url',
      secure: false,
    });
  });

  it('should auto-generate "forRootAsync" method', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        IntegrationModule.forRootAsync({
          isGlobal: true,
          useFactory: () => {
            return {
              url: 'test_url',
              secure: false,
            };
          },
        }),
      ],
    }).compile();

    const integrationModule = moduleRef.get(IntegrationModule);

    expect(integrationModule.options).toEqual({
      url: 'test_url',
      secure: false,
    });
  });

  it('should resolve an alias supplied through "provideInjectionTokensFrom"', async () => {
    const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
      new ConfigurableModuleBuilder<{ text: string }>().build();
    @Module({})
    class FeatureModule extends ConfigurableModuleClass {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        FeatureModule.registerAsync({
          useFactory: (text: string) => ({ text }),
          inject: ['alias'],
          provideInjectionTokensFrom: [
            { provide: 'alias', useExisting: 'source' },
            {
              provide: 'source',
              useFactory: (value: string) => value,
              inject: ['leaf'],
            },
            { provide: 'leaf', useValue: 'ok' },
          ],
        }),
      ],
    }).compile();

    expect(moduleRef.get(MODULE_OPTIONS_TOKEN)).toEqual({ text: 'ok' });
    await moduleRef.close();
  });
});
