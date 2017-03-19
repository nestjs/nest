import * as sinon from 'sinon';
import { expect } from 'chai';
import { ListenerMetadataExplorer } from '../listener-metadata-explorer';
import { MessagePattern } from '../utils/pattern.decorator';
import { Client } from '../utils/client.decorator';
import { Transport } from '../../common/enums/transport.enum';

describe('ListenerMetadataExplorer', () => {
    const pattern = { pattern: 'test' };
    const secPattern = { role: '2', cmd: 'm' };
    const clientMetadata = {};
    const clientSecMetadata = { transport: Transport.REDIS };

    class Test {
        @Client(clientMetadata) client;
        @Client(clientSecMetadata) redisClient;

        get testGet() { return 0; }
        set testSet(val) {}

        constructor() {}

        @MessagePattern(pattern)
        test() {}

        @MessagePattern(secPattern)
        testSec() {}

        noPattern() {}
    }

    let instance: ListenerMetadataExplorer;

    beforeEach(() => {
        instance = new ListenerMetadataExplorer();
    });
    describe('explore', () => {
        let scanForHandlersFromPrototype: sinon.SinonSpy;
        beforeEach(() => {
            scanForHandlersFromPrototype = sinon.spy();
            instance.scanForHandlersFromPrototype = scanForHandlersFromPrototype
        });
        it(`should call "scanForHandlersFromPrototype" with expected arguments`, () => {
            const obj = new Test();
            instance.explore(obj);
            expect(scanForHandlersFromPrototype.calledWith(obj, Object.getPrototypeOf(obj))).to.be.true;
        });
    });
    describe('exploreMethodMetadata', () => {
        let test: Test;
        beforeEach(() => {
            test = new Test();
        });
        it(`should return null when "isPattern" metadata is undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'noPattern');
            expect(metadata).to.eq(null);
        });
        it(`should return pattern properties when "isPattern" metadata is not undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'test');
            expect(metadata).to.have.keys([ 'targetCallback', 'pattern' ]);
            expect(metadata.pattern).to.eql(pattern);
        });
    });
    describe('scanForHandlersFromPrototype', () => {
        it(`should returns only methods with @MessagePattern decorator`, () => {
            const obj = new Test();
            const handlers = instance.scanForHandlersFromPrototype(obj, Object.getPrototypeOf(obj));

            expect(handlers).to.have.length(2);
            expect(handlers[0].pattern).to.eq(pattern);
            expect(handlers[1].pattern).to.eq(secPattern);
        });
    });
    describe('scanForClientHooks', () => {
        it(`should returns properties with @Client decorator`, () => {
            const obj = new Test();
            const hooks = [ ...instance.scanForClientHooks(obj) ];

            expect(hooks).to.have.length(2);
            expect(hooks[0]).to.deep.eq({ property: 'client', metadata: clientMetadata });
            expect(hooks[1]).to.deep.eq({ property: 'redisClient', metadata: clientSecMetadata });
        });
    });
});