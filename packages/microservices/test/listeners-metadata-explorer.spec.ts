import { MetadataScanner } from '../../core/metadata-scanner.js';
import { Client } from '../decorators/client.decorator.js';
import { EventPattern } from '../decorators/event-pattern.decorator.js';
import { MessagePattern } from '../decorators/message-pattern.decorator.js';
import { Transport } from '../enums/transport.enum.js';
import { ListenerMetadataExplorer } from '../listener-metadata-explorer.js';

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
    let getAllMethodNames: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      getAllMethodNames = vi.spyOn(scanner, 'getAllMethodNames');
    });
    it(`should call "scanFromPrototype" with expected arguments`, () => {
      const obj = new Test();
      instance.explore(obj);

      expect(getAllMethodNames).toHaveBeenCalledWith(
        Object.getPrototypeOf(obj),
      );
    });
  });
  describe('exploreMethodMetadata', () => {
    let test: Test;
    beforeEach(() => {
      test = new Test();
    });
    it(`should return undefined when "handlerType" metadata is undefined`, () => {
      const metadata = instance.exploreMethodMetadata(
        test,
        Object.getPrototypeOf(test),
        'noPattern',
      );
      expect(metadata).to.eq(undefined);
    });

    describe('@MessagePattern', () => {
      it(`should return pattern properties when "handlerType" metadata is not undefined`, () => {
        const metadata = instance.exploreMethodMetadata(
          test,
          Object.getPrototypeOf(test),
          'testMessage',
        )!;
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).toEqual(1);
        expect(metadata.patterns[0]).toEqual(msgPattern);
      });
      it(`should return multiple patterns when more than one is declared`, () => {
        const metadata = instance.exploreMethodMetadata(
          test,
          Object.getPrototypeOf(test),
          'testMultipleMessage',
        )!;
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).toEqual(2);
        expect(metadata.patterns[0]).toEqual(firstMultipleMsgPattern);
        expect(metadata.patterns[1]).toEqual(secondMultipleMsgPattern);
      });
    });

    describe('@EventPattern', () => {
      it(`should return pattern properties when "handlerType" metadata is not undefined`, () => {
        const metadata = instance.exploreMethodMetadata(
          test,
          Object.getPrototypeOf(test),
          'testEvent',
        )!;
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).toEqual(1);
        expect(metadata.patterns[0]).toEqual(evtPattern);
      });
      it(`should return multiple patterns when more than one is declared`, () => {
        const metadata = instance.exploreMethodMetadata(
          test,
          Object.getPrototypeOf(test),
          'testMultipleEvent',
        )!;
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'patterns',
          'transport',
          'extras',
        ]);
        expect(metadata.patterns.length).toEqual(2);
        expect(metadata.patterns[0]).toEqual(firstMultipleEvtPattern);
        expect(metadata.patterns[1]).toEqual(secondMultipleEvtPattern);
      });
    });
  });
  describe('scanForClientHooks', () => {
    it(`should return properties with @Client decorator`, () => {
      const obj = new Test();
      const hooks = [...instance.scanForClientHooks(obj)];

      expect(hooks).toHaveLength(2);
      expect(hooks[0]).toEqual({
        property: 'client',
        metadata: clientMetadata,
      });
      expect(hooks[1]).toEqual({
        property: 'redisClient',
        metadata: clientSecMetadata,
      });
    });
  });
});
