import * as sinon from 'sinon';
import { expect } from 'chai';
import { WebSocketGateway } from '../utils/socket-gateway.decorator';
import { WebSocketServer } from '../utils/gateway-server.decorator';
import { SubscribeMessage } from '../utils/subscribe-message.decorator';
import { GatewayMetadataExplorer } from '../gateway-metadata-explorer';

describe('GatewayMetadataExplorer', () => {
    const message = 'test';
    const secMessage = 'test2';

    @WebSocketGateway()
    class Test {
        @WebSocketServer() server;
        @WebSocketServer() anotherServer;

        get testGet() { return 0; }
        set testSet(val) {}

        constructor() {}

        @SubscribeMessage({ value: message })
        test() {}

        @SubscribeMessage({ value: secMessage })
        testSec() {}

        noMessage() {}
    }
    let instance: GatewayMetadataExplorer;

    beforeEach(() => {
        instance = new GatewayMetadataExplorer();
    });
    describe('explore', () => {
        let scanForHandlersFromPrototype: sinon.SinonSpy;
        beforeEach(() => {
            scanForHandlersFromPrototype = sinon.spy();
            instance.scanForHandlersFromPrototype = scanForHandlersFromPrototype
        });
        it(`should call "scanForHandlersFromPrototype" with expected arguments`, () => {
            const obj = new Test();
            instance.explore(<any>obj);
            expect(scanForHandlersFromPrototype.calledWith(obj, Object.getPrototypeOf(obj))).to.be.true;
        });
    });
    describe('exploreMethodMetadata', () => {
        let test: Test;
        beforeEach(() => {
            test = new Test();
        });
        it(`should return null when "isMessageMapping" metadata is undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'noMessage');
            expect(metadata).to.eq(null);
        });
        it(`should return message mapping properties when "isMessageMapping" metadata is not undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'test');
            expect(metadata).to.have.keys([ 'targetCallback', 'message' ]);
            expect(metadata.message).to.eql(message);
        });
    });
    describe('scanForHandlersFromPrototype', () => {
        it(`should returns only methods with @MessagePattern decorator`, () => {
            const obj = new Test();
            const handlers = instance.scanForHandlersFromPrototype(<any>obj, Object.getPrototypeOf(obj));

            expect(handlers).to.have.length(2);
            expect(handlers[0].message).to.eq(message);
            expect(handlers[1].message).to.eq(secMessage);
        });
    });
    describe('scanForServerHooks', () => {
        it(`should returns properties with @Client decorator`, () => {
            const obj = new Test();
            const servers = [ ...instance.scanForServerHooks(<any>obj) ];

            expect(servers).to.have.length(2);
            expect(servers).to.deep.eq([ 'server', 'anotherServer' ]);
        });
    });
});