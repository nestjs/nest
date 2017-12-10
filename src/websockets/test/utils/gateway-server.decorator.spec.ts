import 'reflect-metadata';

import { GATEWAY_SERVER_METADATA } from '../../constants';
import { WebSocketServer } from '../../utils/gateway-server.decorator';
import { expect } from 'chai'

describe('@WebSocketServer', () => {
    class TestGateway {
        @WebSocketServer()
        static server: any;
    }

    it('should decorate server property with expected metadata', () => {
        const isServer = Reflect.getOwnMetadata(GATEWAY_SERVER_METADATA, TestGateway, 'server');
        expect(isServer).to.be.eql(true);
    });
    it('should set property value to null by default', () => {
        expect(TestGateway.server).to.be.eql(null);
    });
});
