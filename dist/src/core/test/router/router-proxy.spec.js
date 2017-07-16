"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const router_proxy_1 = require("../../router/router-proxy");
const exceptions_handler_1 = require("../../exceptions/exceptions-handler");
const http_exception_1 = require("../../exceptions/http-exception");
describe('RouterProxy', () => {
    let routerProxy;
    let handlerMock;
    let handler;
    beforeEach(() => {
        handler = new exceptions_handler_1.ExceptionsHandler();
        handlerMock = sinon.mock(handler);
        routerProxy = new router_proxy_1.RouterProxy();
    });
    describe('createProxy', () => {
        it('should method return thunk', () => {
            const proxy = routerProxy.createProxy(() => { }, handler);
            chai_1.expect(typeof proxy === 'function').to.be.true;
        });
        it('should method encapsulate callback passed as argument', () => {
            const expectation = handlerMock.expects('next').once();
            const proxy = routerProxy.createProxy((req, res, next) => {
                throw new http_exception_1.HttpException('test', 500);
            }, handler);
            proxy(null, null, null);
            expectation.verify();
        });
        it('should method encapsulate async callback passed as argument', (done) => {
            const expectation = handlerMock.expects('next').once();
            const proxy = routerProxy.createProxy((req, res, next) => __awaiter(this, void 0, void 0, function* () {
                throw new http_exception_1.HttpException('test', 500);
            }), handler);
            proxy(null, null, null);
            setTimeout(() => {
                expectation.verify();
                done();
            }, 0);
        });
    });
});
//# sourceMappingURL=router-proxy.spec.js.map