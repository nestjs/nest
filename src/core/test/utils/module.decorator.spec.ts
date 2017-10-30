import 'reflect-metadata';
import { expect } from 'chai';
import { Module } from '../../utils/decorators/module.decorator';
import { InvalidModuleConfigException } from '../../exceptions/invalid-module-config.exception';

describe('@Module', () => {
    const moduleProps = {
        components: [ 'Test' ],
        modules: [ 'Test' ],
        exports: [ 'Test' ],
        controllers: [ 'Test' ]
    };

    @Module(moduleProps)
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

        expect(Module.bind(null, invalidProps)).to.throw(InvalidModuleConfigException);
    });

});