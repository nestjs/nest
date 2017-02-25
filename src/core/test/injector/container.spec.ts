import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../injector/container';
import { Module } from '../../../common/utils/module.decorator';
import { UnkownModuleException } from '../../../errors/exceptions/unkown-module.exception';

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
        (container as any)['modules'] = modules;

        container.addModule(TestModule);
        container.addModule(TestModule);

        expect(setSpy.calledOnce).to.be.true;
    });

    it('should "addComponent" throw "UnkownModuleException" when module is not stored in collection', () => {
        expect(() => container.addComponent(null, TestModule)).throw(UnkownModuleException);
    });

    it('should "addRoute" throw "UnkownModuleException" when module is not stored in collection', () => {
        expect(() => container.addRoute(null, TestModule)).throw(UnkownModuleException);
    });

    it('should "addExportedComponent" throw "UnkownModuleException" when module is not stored in collection', () => {
        expect(() => container.addExportedComponent(null, TestModule)).throw(UnkownModuleException);
    });

});