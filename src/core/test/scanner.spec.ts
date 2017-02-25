import * as sinon from 'sinon';
import { DependenciesScanner } from './../scanner';
import { NestContainer } from './../injector/container';
import { Module } from '../../common/utils/module.decorator';
import { NestModule } from '../../common/interfaces/nest-module.interface';
import { Component } from '../../common/utils/component.decorator';
import { Controller } from '../../common/utils/controller.decorator';

describe('DependenciesScanner', () => {

    @Component() class TestComponent {}
    @Controller({ path: '' }) class TestRoute {}

    @Module({
        components: [ TestComponent ],
        controllers: [ TestRoute ],
        exports: [ TestComponent ]
    })
    class AnotherTestModule implements NestModule {}

    @Module({
        modules: [ AnotherTestModule ],
        components: [ TestComponent ],
        controllers: [ TestRoute ],
    })
    class TestModule implements NestModule {}

    let scanner: DependenciesScanner;
    let mockContainer: sinon.SinonMock;
    let container: NestContainer;

    before(() => {
        container = new NestContainer();
        mockContainer = sinon.mock(container);
    });

    beforeEach(() => {
        scanner = new DependenciesScanner(container);
    });

    afterEach(() => {
        mockContainer.restore();
    });

    it('should "storeModule" call twice (2 modules) container method "addModule"', () => {
        const expectation = mockContainer.expects('addModule').twice();
        scanner.scan(TestModule);
        expectation.verify();
    });

    it('should "storeComponent" call twice (2 components) container method "addComponent"', () => {
        const expectation = mockContainer.expects('addComponent').twice();
        const stub = sinon.stub(scanner, 'storeExportedComponent');

        scanner.scan(TestModule);
        expectation.verify();
        stub.restore();
    });

    it('should "storeRoute" call twice (2 components) container method "addRoute"', () => {
        const expectation = mockContainer.expects('addRoute').twice();
        scanner.scan(TestModule);
        expectation.verify();
    });

    it('should "storeExportedComponent" call once (1 component) container method "addExportedComponent"', () => {
        const expectation = mockContainer.expects('addExportedComponent').once();
        scanner.scan(TestModule);
        expectation.verify();
    });

});