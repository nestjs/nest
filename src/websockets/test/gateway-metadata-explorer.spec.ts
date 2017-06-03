import * as sinon from 'sinon';
import { expect } from 'chai';
import { WebSocketGateway } from '../utils/socket-gateway.decorator';
import { WebSocketServer } from '../utils/gateway-server.decorator';
import { SubscribeMessage } from '../utils/subscribe-message.decorator';
import { GatewayMetadataExplorer } from '../gateway-metadata-explorer';
import { MetadataScanner } from '../../core/metadata-scanner';

describe('GatewayMetadataExplorer', () => {
    const message = 'test';
    const secMessage = 'test2';

    @WebSocketGateway()
    class Test {
        @WebSocketServer() public server;
        @WebSocketServer() public anotherServer;

        get testGet() { return 0; }
        set testSet(val) {}

        constructor() {}

        @SubscribeMessage({ value: message })
        public test() {}

        @SubscribeMessage({ value: secMessage })
        public testSec() {}

        public noMessage() {}
    }
    let instance: GatewayMetadataExplorer;
    let scanner: MetadataScanner;

    beforeEach(() => {
        scanner = new MetadataScanner();
        instance = new GatewayMetadataExplorer(scanner);
    });
    describe('explore', () => {
        let scanFromPrototype: sinon.SinonSpy;
        beforeEach(() => {
            scanFromPrototype = sinon.spy(scanner, 'scanFromPrototype');
        });
        it(`should call "scanFromPrototype" with expected arguments`, () => {
            const obj = new Test();
            instance.explore(obj as any);

            const [ argObj, argProto ] = scanFromPrototype.getCall(0).args;
            expect(argObj).to.be.eql(obj);
            expect(argProto).to.be.eql(Object.getPrototypeOf(obj));
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
            expect(metadata).to.have.keys([ 'callback', 'message' ]);
            expect(metadata.message).to.eql(message);
        });
    });
    describe('scanForServerHooks', () => {
        it(`should returns properties with @Client decorator`, () => {
            const obj = new Test();
            const servers = [ ...instance.scanForServerHooks(obj as any) ];

            expect(servers).to.have.length(2);
            expect(servers).to.deep.eq([ 'server', 'anotherServer' ]);
        });
    });
});