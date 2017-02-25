import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouterBuilder } from '../../router/router-builder';
import { Controller } from '../../../common/utils/controller.decorator';
import { RequestMapping } from '../../../common/utils/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { NestMode } from '../../../common/enums/nest-mode.enum';

describe('RouterBuilder', () => {
    @Controller({ path: 'global' })
    class TestRoute {
        @RequestMapping({ path: 'test' })
        getTest() {}

        @RequestMapping({ path: 'test', method: RequestMethod.POST })
        postTest() {}

        @RequestMapping({ path: 'another-test', method: RequestMethod.ALL })
        anotherTest() {}

        private simplePlainMethod() {}
    }

    let routerBuilder: RouterBuilder;
    beforeEach(() => {
        routerBuilder = new RouterBuilder(null, null, NestMode.TEST);
    });

    describe('scanForPathsFromPrototype', () => {

        it('should method return expected list of route paths', () => {
            const paths = routerBuilder.scanForPathsFromPrototype(new TestRoute(), TestRoute.prototype);

            expect(paths).to.have.length(3);

            expect(paths[0].path).to.eql('/test');
            expect(paths[1].path).to.eql('/test');
            expect(paths[2].path).to.eql('/another-test');

            expect(paths[0].requestMethod).to.eql(RequestMethod.GET);
            expect(paths[1].requestMethod).to.eql(RequestMethod.POST);
            expect(paths[2].requestMethod).to.eql(RequestMethod.ALL);
        });

    });

    describe('exploreMethodMetadata', () => {

        it('should method return expected object which represent single route', () => {
            const instance = new TestRoute();
            const instanceProto = Object.getPrototypeOf(instance);

            const route = routerBuilder.exploreMethodMetadata(new TestRoute(), instanceProto, 'getTest');

            expect(route.path).to.eql('/test');
            expect(route.requestMethod).to.eql(RequestMethod.GET);
        });

    });

    describe('applyPathsToRouterProxy', () => {

        it('should method return expected object which represent single route', () => {
            const bindStub = sinon.stub(routerBuilder, 'bindMethodToRouterProxy');
            const paths = [ null, null ];

            routerBuilder.applyPathsToRouterProxy(null, paths);

            expect(bindStub.calledWith(null, null)).to.be.true;
            expect(bindStub.callCount).to.be.eql(paths.length);
        });

    });

});