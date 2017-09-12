import * as sinon from 'sinon';
import { expect } from 'chai';
import { ExpressRouterExplorer } from '../../router/router-explorer';
import { Controller } from '../../../common/utils/decorators/controller.decorator';
import { RequestMapping } from '../../../common/utils/decorators/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { MetadataScanner } from '../../metadata-scanner';

describe('RouterExplorer', () => {
    @Controller('global')
    class TestRoute {
        @RequestMapping({ path: 'test' })
        public getTest() {}

        @RequestMapping({ path: 'test', method: RequestMethod.POST })
        public postTest() {}

        @RequestMapping({ path: 'another-test', method: RequestMethod.ALL })
        public anotherTest() {}
    }

    let routerBuilder: ExpressRouterExplorer;
    beforeEach(() => {
        routerBuilder = new ExpressRouterExplorer(new MetadataScanner(), null);
    });
    describe('scanForPaths', () => {
        it('should method return expected list of route paths', () => {
            const paths = routerBuilder.scanForPaths(new TestRoute());

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
            const bindStub = sinon.stub(routerBuilder, 'applyCallbackToRouter');
            const paths = [
                { path: '', requestMethod: RequestMethod.GET },
                { path: 'test', requestMethod: RequestMethod.GET },
            ];

            routerBuilder.applyPathsToRouterProxy(null, paths as any, null, '');

            expect(bindStub.calledWith(null, paths[0], null)).to.be.true;
            expect(bindStub.callCount).to.be.eql(paths.length);
        });
    });
});