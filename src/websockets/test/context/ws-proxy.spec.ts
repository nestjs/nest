import * as sinon from 'sinon';
import { expect } from 'chai';
import { WsProxy} from './../../context/ws-proxy';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler';
import { WsException } from '../../exceptions/ws-exception';

describe('WsProxy', () => {
    let routerProxy: WsProxy;
    let handlerMock: sinon.SinonMock;
    let handler: WsExceptionsHandler;

    beforeEach(() => {
        handler = new WsExceptionsHandler();
        handlerMock = sinon.mock(handler);
        routerProxy = new WsProxy();
    });

    describe('create', () => {

        it('should method return thunk', async () => {
            const proxy = await routerProxy.create(async (client, data) => {}, handler);
            expect(typeof proxy === 'function').to.be.true;
        });

        it('should method encapsulate callback passed as argument', async () => {
            const expectation = handlerMock.expects('handle').once();
            const proxy = routerProxy.create(async (client, data) => {
                throw new WsException('test');
            }, handler);
            await proxy(null, null);
            expectation.verify();
        });

    });
});