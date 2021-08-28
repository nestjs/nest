import { Module } from '../../decorators/modules/module.decorator';

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
});
