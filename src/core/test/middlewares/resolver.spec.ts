import * as sinon from "sinon";
import { expect } from "chai";
import { MiddlewaresResolver } from "../../middlewares/resolver";
import { MiddlewaresContainer } from "../../middlewares/container";
import { Component } from "../../../common/utils/component.decorator";
import { Middleware } from "../../middlewares/interfaces/middleware.interface";
import { RoutesMapper } from "../../middlewares/routes-mapper";

describe('MiddlewaresResolver', () => {
    @Component()
    class TestMiddleware implements Middleware {
        resolve() {
            return (req, res, next) => {}
        }
    }

    let resolver: MiddlewaresResolver;
    let container: MiddlewaresContainer;
    let mockContainer: sinon.SinonMock;

    beforeEach(() => {
        container = new MiddlewaresContainer(new RoutesMapper());
        resolver = new MiddlewaresResolver(container);
        mockContainer = sinon.mock(container);
    });

    it('should resolve middleware instances from container', () => {
        const loadInstanceOfMiddleware = sinon.stub(resolver["instanceLoader"], "loadInstanceOfMiddleware");
        const middlewares = new Map();
        middlewares.set(TestMiddleware, null);

        mockContainer.expects("getMiddlewares").returns(middlewares);
        resolver.resolveInstances(null, null);

        expect(loadInstanceOfMiddleware.callCount).to.be.equal(middlewares.size);
        expect(loadInstanceOfMiddleware.calledWith(
            TestMiddleware,
            middlewares,
            null
        )).to.be.true;

        loadInstanceOfMiddleware.restore();
    });
});