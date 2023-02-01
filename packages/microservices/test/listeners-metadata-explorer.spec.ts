import { expect } from 'chai';
import * as sinon from 'sinon';
import { MetadataScanner } from '../../core/metadata-scanner';
import { Client } from '../decorators/client.decorator';
import { EventPattern } from '../decorators/event-pattern.decorator';
import { MessagePattern } from '../decorators/message-pattern.decorator';
import { Transport } from '../enums/transport.enum';
import { ListenerMetadataExplorer } from '../listener-metadata-explorer';

describe('ListenerMetadataExplorer', () => {
  const msgPattern = { pattern: 'testMsg' };
  const firstMultipleMsgPattern = { pattern: 'testMultipleMsg1' };
  const secondMultipleMsgPattern = { pattern: 'testMultipleMsg2' };
  const clientMetadata = {};
  const clientSecMetadata = { transport: Transport.REDIS };
  const evtPattern = { role: 'testEvt' };
  const firstMultipleEvtPattern = { role: 'testMultipleEvt1' };
  const secondMultipleEvtPattern = { role: 'testMultipleEvt2' };

  class Test {
    @Client(clientMetadata as any)
    public client;
    @Client(clientSecMetadata as any)
    public redisClient;

    get testGet() {
      return 0;
    }
    set testSet(val) {}

    constructor() {}

    @MessagePattern(msgPattern)
    public testMessage() {}

    @MessagePattern([firstMultipleMsgPattern, secondMultipleMsgPattern])
    public testMultipleMessage() {}

    @EventPattern(evtPattern)
    public testEvent() {}

    @EventPattern([firstMultipleEvtPattern, secondMultipleEvtPattern])
    public testMultipleEvent() {}

    public noPattern() {}
  }
  let scanner: MetadataScanner;
  let instance: ListenerMetadataExplorer;

  beforeEach(() => {
    scanner = new MetadataScanner();
    instance = new ListenerMetadataExplorer(scanner);
  });
  describe('explore', () => {
    let getAllMethodNames: sinon.SinonSpy;
    beforeEach(() => {
      getAllMethodNames = sinon.spy(scanner, 'getAllMethodNames');
    });
    it(`should call "scanFromPrototype" with expected arguments`, () => {
      const obj = new Test();
      instance.explore(obj);

      const { args } = getAllMethodNames.getCall(0);
      expect(args[0]).to.be.eql(Object.getPrototypeOf(obj));
    });
  });
  describe('exploreMethodMetadata', () => {
    let test: Test;
    beforeEach(() => {
      test = new Test();
    });
    it(`should return undefined when "handlerType" metadata is undefined`, () => {
      const metadata = instance.exploreMethodMetadata(
        Object.getPrototypeOf(test),
        'noPattern',
      );
      expect(metadata).to.eq(undefined);
    });

    describe('@MessagePattern', () => {
      it(`should return pattern properties when "handlerType" metadata is not undefined`, () => {
        const metadata = instance.exploreMethodMetadata(
          Object.getPrototypeOf(test),
          'testMessage',
        );
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).to.eql(1);
        expect(metadata.patterns[0]).to.eql(msgPattern);
      });
      it(`should return multiple patterns when more than one is declared`, () => {
        const metadata = instance.exploreMethodMetadata(
          Object.getPrototypeOf(test),
          'testMultipleMessage',
        );
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).to.eql(2);
        expect(metadata.patterns[0]).to.eql(firstMultipleMsgPattern);
        expect(metadata.patterns[1]).to.eql(secondMultipleMsgPattern);
      });
    });

    describe('@EventPattern', () => {
      it(`should return pattern properties when "handlerType" metadata is not undefined`, () => {
        const metadata = instance.exploreMethodMetadata(
          Object.getPrototypeOf(test),
          'testEvent',
        );
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).to.eql(1);
        expect(metadata.patterns[0]).to.eql(evtPattern);
      });
      it(`should return multiple patterns when more than one is declared`, () => {
        const metadata = instance.exploreMethodMetadata(
          Object.getPrototypeOf(test),
          'testMultipleEvent',
        );
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).to.eql(2);
        expect(metadata.patterns[0]).to.eql(firstMultipleEvtPattern);
        expect(metadata.patterns[1]).to.eql(secondMultipleEvtPattern);
      });
    });
  });
  describe('scanForClientHooks', () => {
    it(`should return properties with @Client decorator`, () => {
      const obj = new Test();
      const hooks = [...instance.scanForClientHooks(obj)];

      expect(hooks).to.have.length(2);
      expect(hooks[0]).to.deep.eq({
        property: 'client',
        metadata: clientMetadata,
      });
      expect(hooks[1]).to.deep.eq({
        property: 'redisClient',
        metadata: clientSecMetadata,
      });
    });
  });
});
