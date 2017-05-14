import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../injector/container';
import { Module } from '../../../common/utils/decorators/module.decorator';
import { UnknownModuleException } from '../../errors/exceptions/unknown-module.exception';

describe('NestContainer', () => {
    let container: NestContainer;

    @Module({})
    class TestModule {}

    beforeEach(() => {
        container = new NestContainer();
    });

    it('should not add module if already exists in collection', () => {
        const modules = new Map();
        const setSpy = sinon.spy(modules, 'set');
        (container as any).modules = modules;

        container.addModule(TestModule, []);
        container.addModule(TestModule, []);

        expect(setSpy.calledOnce).to.be.true;
    });

    it('should "addComponent" throw "UnknownModuleException" when module is not stored in collection', () => {
        expect(() => container.addComponent(null, 'TestModule')).throw(UnknownModuleException);
    });

    it('should "addController" throw "UnknownModuleException" when module is not stored in collection', () => {
        expect(() => container.addController(null, 'TestModule')).throw(UnknownModuleException);
    });

    it('should "addExportedComponent" throw "UnknownModuleException" when module is not stored in collection', () => {
        expect(() => container.addExportedComponent(null, 'TestModule')).throw(UnknownModuleException);
    });

});