import { expect } from 'chai';
import { Provider } from '../../interfaces';
import { ConfigurableModuleBuilder } from '../../module-utils';

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
      ).to.deep.include({
        global: true,
      });
    });
  });
  describe('setClassMethodName', () => {
    it('should set static class method name and return typed builder', () => {
      const { ConfigurableModuleClass } = new ConfigurableModuleBuilder()
        .setClassMethodName('forRoot')
        .build();

      expect(ConfigurableModuleClass.forRoot).to.not.be.undefined;
      expect(ConfigurableModuleClass.forRootAsync).to.not.be.undefined;
      expect((ConfigurableModuleClass as any).register).to.be.undefined;
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
      ).to.not.be.undefined;
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

      expect(definition.global).to.equal(true);
      expect(definition.providers).to.have.length(5);
      console.log(definition.providers);
      expect(definition.providers).to.deep.contain('test');
      expect(definition.providers).to.include.members(
        provideInjectionTokensFrom.slice(0, 2),
      );
      expect(definition.providers).not.to.include(
        provideInjectionTokensFrom[2],
      );
      expect(MODULE_OPTIONS_TOKEN).to.equal('RANDOM_TEST_MODULE_OPTIONS');
      expect((definition.providers[0] as any).provide).to.equal(
        'RANDOM_TEST_MODULE_OPTIONS',
      );

      try {
        expect(ASYNC_OPTIONS_TYPE.imports).to.equal(undefined);
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal(
          '"ASYNC_OPTIONS_TYPE" is not supposed to be used as a value.',
        );
      }
      try {
        expect(OPTIONS_TYPE.isGlobal).to.equal(undefined);
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal(
          '"OPTIONS_TYPE" is not supposed to be used as a value.',
        );
      }
    });
  });
});
