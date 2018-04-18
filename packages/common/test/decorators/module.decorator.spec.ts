import 'reflect-metadata';
import { expect } from 'chai';
import { Module } from '../../decorators/modules/module.decorator';
import { InvalidModuleConfigException } from '../../decorators/modules/exceptions/invalid-module-config.exception';

describe('@Module', () => {
  const moduleProps = {
    components: ['Test'],
    modules: ['Test'],
    exports: ['Test'],
    controllers: ['Test'],
  };

  @Module(moduleProps as any)
  class TestModule {}

  it('should enhance class with expected module metadata', () => {
    const modules = Reflect.getMetadata('modules', TestModule);
    const components = Reflect.getMetadata('components', TestModule);
    const exports = Reflect.getMetadata('exports', TestModule);
    const controllers = Reflect.getMetadata('controllers', TestModule);

    expect(modules).to.be.eql(moduleProps.modules);
    expect(components).to.be.eql(moduleProps.components);
    expect(controllers).to.be.eql(moduleProps.controllers);
    expect(exports).to.be.eql(moduleProps.exports);
  });

  it('should throw exception when module properties are invalid', () => {
    const invalidProps = {
      ...moduleProps,
      test: [],
    };

    expect(Module.bind(null, invalidProps)).to.throw(
      InvalidModuleConfigException,
    );
  });

  describe(`when "imports" is used`, () => {
    const imports = ['imports'];
    @Module({
      imports,
    } as any)
    class TestModule2 {}
    it(`should override "modules" metadata when "imports" exists`, () => {
      const modules = Reflect.getMetadata('modules', TestModule2);
      expect(modules).to.be.eql(imports);
    });

    @Module({
      ...moduleProps as any,
      imports: null,
    } as any)
    class TestModule3 {}
    it(`should not override "modules" metadata when "imports" does not exist`, () => {
      const modules = Reflect.getMetadata('modules', TestModule3);
      expect(modules).to.be.eql(moduleProps.modules);
    });
  });

  describe(`when "providers" is used`, () => {
    const providers = ['providers'];
    @Module({
      providers,
    } as any)
    class TestModule2 {}
    it(`should override "components" metadata when "providers" exists`, () => {
      const components = Reflect.getMetadata('components', TestModule2);
      expect(components).to.be.eql(providers);
    });

    @Module({
      ...moduleProps as any,
      providers: null,
    } as any)
    class TestModule3 {}
    it(`should not override "components" metadata when "providers" does not exist`, () => {
      const components = Reflect.getMetadata('components', TestModule3);
      expect(components).to.be.eql(moduleProps.components);
    });
  });
});
