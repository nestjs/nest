import { Provider } from '../../interfaces/index.js';
import { ConfigurableModuleBuilder } from '../../module-utils/index.js';

describe('ConfigurableModuleBuilder', () => {
  describe('setExtras', () => {
    it('should apply module definition transformer function and return typed builder', () => {
      const { ConfigurableModuleClass } = new ConfigurableModuleBuilder()
        .setExtras(
          { isGlobal: false },
          (definition, extras: { isGlobal: boolean }) => ({
            ...definition,
            global: extras.isGlobal,
          }),
        )
        .build();

      expect(
        ConfigurableModuleClass.register({
          // No type error
          isGlobal: true,
        }),
      ).toMatchObject({
        global: true,
      });
    });

    it('should preserve extras in registerAsync transformation', () => {
      let capturedExtras: any;

      const { ConfigurableModuleClass } = new ConfigurableModuleBuilder()
        .setExtras(
          { folder: 'default' },
          (definition, extras: { folder: string }) => {
            capturedExtras = extras;
            return {
              ...definition,
              customProperty: `folder: ${extras.folder}`,
            };
          },
        )
        .build();

      const asyncResult = ConfigurableModuleClass.registerAsync({
        useFactory: () => ({}),
        folder: 'forRootAsync',
      });

      expect(capturedExtras).toEqual({ folder: 'forRootAsync' });
      expect(asyncResult).toHaveProperty(
        'customProperty',
        'folder: forRootAsync',
      );
    });
  });
  describe('setClassMethodName', () => {
    it('should set static class method name and return typed builder', () => {
      const { ConfigurableModuleClass } = new ConfigurableModuleBuilder()
        .setClassMethodName('forRoot')
        .build();

      expect(ConfigurableModuleClass.forRoot).not.toBeUndefined();
      expect(ConfigurableModuleClass.forRootAsync).not.toBeUndefined();
      expect((ConfigurableModuleClass as any).register).toBeUndefined();
    });
  });
  describe('setFactoryMethodName', () => {
    it('should set configuration factory class method name and return typed builder', () => {
      const { ConfigurableModuleClass } = new ConfigurableModuleBuilder()
        .setFactoryMethodName('createOptions')
        .build();

      expect(
        ConfigurableModuleClass.registerAsync({
          useClass: class {
            // No type error
            createOptions() {}
          },
        }),
      ).not.toBeUndefined();
    });
  });
  describe('build', () => {
    it('should return a fully typed "ConfigurableModuleClass"', () => {
      type ExtraConfig = { isGlobal?: boolean; extraProviders: Provider[] };

      const {
        ConfigurableModuleClass,
        OPTIONS_TYPE,
        ASYNC_OPTIONS_TYPE,
        MODULE_OPTIONS_TOKEN,
      } = new ConfigurableModuleBuilder({
        moduleName: 'RandomTest',
        alwaysTransient: true,
      })
        .setFactoryMethodName('createOptions')
        .setClassMethodName('forFeature')
        .setExtras<ExtraConfig>(
          { isGlobal: false, extraProviders: [] },
          (definition, extras) => ({
            ...definition,
            global: extras.isGlobal,
            providers: definition.providers?.concat(extras.extraProviders),
          }),
        )
        .build();

      const provideInjectionTokensFrom: Provider[] = [
        {
          provide: 'a',
          useFactory: () => {},
          inject: ['b'],
        },
        {
          provide: 'b',
          useFactory: () => {},
          inject: ['x'],
        },
        {
          provide: 'c',
          useFactory: () => {},
          inject: ['y'],
        },
      ];
      const definition = ConfigurableModuleClass.forFeatureAsync({
        useFactory: () => {},
        inject: ['a'],
        provideInjectionTokensFrom,
        isGlobal: true,
        extraProviders: ['test' as any],
      });

      expect(definition.global).toBe(true);
      expect(definition.providers).toHaveLength(5);
      expect(definition.providers).toContainEqual('test');
      expect(definition.providers).toEqual(
        expect.arrayContaining(provideInjectionTokensFrom.slice(0, 2)),
      );
      expect(definition.providers).not.toContain(provideInjectionTokensFrom[2]);
      expect(MODULE_OPTIONS_TOKEN).toBe('RANDOM_TEST_MODULE_OPTIONS');
      expect((definition.providers![0] as any).provide).toBe(
        'RANDOM_TEST_MODULE_OPTIONS',
      );

      try {
        expect(ASYNC_OPTIONS_TYPE.imports).toBe(undefined);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(
          '"ASYNC_OPTIONS_TYPE" is not supposed to be used as a value.',
        );
      }
      try {
        expect(OPTIONS_TYPE.isGlobal).toBe(undefined);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(
          '"OPTIONS_TYPE" is not supposed to be used as a value.',
        );
      }
    });
  });
});
