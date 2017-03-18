import * as sinon from 'sinon';
import { expect } from 'chai';
import { InstanceLoader } from '../../injector/instance-loader';
import { NestContainer } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { Controller } from '../../../common/utils/controller.decorator';
import { Component } from '../../../common/utils/component.decorator';
import { NestMode } from '../../../common/enums/nest-mode.enum';
import { Logger } from '../../../common/services/logger.service';

describe('InstanceLoader', () => {
    let loader: InstanceLoader;
    let container: NestContainer;
    let mockContainer: sinon.SinonMock;

    @Controller({ path: '' })
    class TestRoute {}

    @Component()
    class TestComponent {}

    before(() => Logger.setMode(NestMode.TEST));

    beforeEach(() => {
        container = new NestContainer();
        loader = new InstanceLoader(container);
        mockContainer = sinon.mock(container);
    });

    it('should call "loadPrototypeOfInstance" for each component and route in each module', () => {
        const injector = new Injector();
        loader['injector'] = injector;

        const module = {
            components: new Map(),
            routes: new Map(),
        };
        module.components.set('TestComponent', { instance: null, metatype: TestComponent });
        module.routes.set('TestRoute', { instance: null, metatype: TestRoute });

        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);

        const loadComponentPrototypeStub = sinon.stub(injector, 'loadPrototypeOfInstance');

        sinon.stub(injector, 'loadInstanceOfRoute');
        sinon.stub(injector, 'loadInstanceOfComponent');

        loader.createInstancesOfDependencies();
        expect(loadComponentPrototypeStub.calledWith(TestComponent, module.components)).to.be.true;
        expect(loadComponentPrototypeStub.calledWith(TestRoute, module.components)).to.be.true;
    });

    it('should call "loadInstanceOfComponent" for each component in each module', () => {
        const injector = new Injector();
        loader['injector'] = injector;

        const module = {
            components: new Map(),
            routes: new Map(),
        };
        module.components.set('TestComponent', { instance: null, metatype: TestComponent });

        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);

        const loadComponentStub = sinon.stub(injector, 'loadInstanceOfComponent');
        sinon.stub(injector, 'loadInstanceOfRoute');

        loader.createInstancesOfDependencies();
        expect(loadComponentStub.calledWith(TestComponent, module)).to.be.true;
    });

    it('should call "loadInstanceOfRoute" for each route in each module', () => {
        const injector = new Injector();
        loader['injector'] = injector;

        const module = {
            components: new Map(),
            routes: new Map(),
        };
        module.routes.set('TestRoute', { instance: null, metatype: TestRoute });

        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);

        sinon.stub(injector, 'loadInstanceOfComponent');
        const loadRoutesStub = sinon.stub(injector, 'loadInstanceOfRoute');

        loader.createInstancesOfDependencies();
        expect(loadRoutesStub.calledWith(TestRoute, module)).to.be.true;
    });

});