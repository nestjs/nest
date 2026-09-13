import { Module } from '../../decorators/modules/module.decorator.js';

describe('@Module', () => {
  const moduleProps = {
    providers: ['Test'],
    imports: ['Test'],
    exports: ['Test'],
    controllers: ['Test'],
  };

  @Module(moduleProps as any)
  class TestModule {}

  it('should enhance class with expected module metadata', () => {
    const imports = Reflect.getMetadata('imports', TestModule);
    const providers = Reflect.getMetadata('providers', TestModule);
    const exports = Reflect.getMetadata('exports', TestModule);
    const controllers = Reflect.getMetadata('controllers', TestModule);

    expect(imports).toEqual(moduleProps.imports);
    expect(providers).toEqual(moduleProps.providers);
    expect(controllers).toEqual(moduleProps.controllers);
    expect(exports).toEqual(moduleProps.exports);
  });

  it('should throw exception when module properties are invalid', () => {
    const invalidProps = {
      ...moduleProps,
      test: [],
    };

    expect(Module.bind(null, invalidProps)).toThrow(Error);
  });

  it('should ignore properties inherited through the prototype chain', () => {
    const inheritedProps = { exports: ['Inherited'] };
    const metadata = Object.create(inheritedProps);
    metadata.providers = ['Own'];

    @Module(metadata)
    class ModuleWithInheritedProps {}

    expect(Reflect.getMetadata('providers', ModuleWithInheritedProps)).toEqual([
      'Own',
    ]);
    expect(Reflect.hasMetadata('exports', ModuleWithInheritedProps)).toBe(
      false,
    );
  });
});
