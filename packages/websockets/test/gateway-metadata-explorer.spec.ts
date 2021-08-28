import * as sinon from 'sinon';
import { MetadataScanner } from '../../core/metadata-scanner';
import { WebSocketServer } from '../decorators/gateway-server.decorator';
import { WebSocketGateway } from '../decorators/socket-gateway.decorator';
import { SubscribeMessage } from '../decorators/subscribe-message.decorator';
import { GatewayMetadataExplorer } from '../gateway-metadata-explorer';

describe('GatewayMetadataExplorer', () => {
  const message = 'test';
  const secMessage = 'test2';

  @WebSocketGateway()
  class Test {
    @WebSocketServer() public server;
    @WebSocketServer() public anotherServer;

    get testGet() {
      return 0;
    }
    set testSet(val) {}

    constructor() {}

    @SubscribeMessage(message)
    public test() {}

    @SubscribeMessage(secMessage)
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

      const [argObj, argProto] = scanFromPrototype.getCall(0).args;
      expect(argObj).toEqual(obj);
      expect(argProto).toEqual(Object.getPrototypeOf(obj));
    });
  });
  describe('exploreMethodMetadata', () => {
    let test: Test;
    beforeEach(() => {
      test = new Test();
    });
    it(`should return null when "isMessageMapping" metadata is undefined`, () => {
      const metadata = instance.exploreMethodMetadata(test, 'noMessage');
      expect(metadata).toEqual(null);
    });
    it(`should return message mapping properties when "isMessageMapping" metadata is not undefined`, () => {
      const metadata = instance.exploreMethodMetadata(test, 'test');
      expect(Object.keys(metadata)).toEqual(expect.arrayContaining(['callback', 'message', 'methodName']));
      expect(metadata.message).toEqual(message);
    });
  });
  describe('scanForServerHooks', () => {
    it(`should return properties with @Client decorator`, () => {
      const obj = new Test();
      const servers = [...instance.scanForServerHooks(obj as any)];

      expect(servers.length).toBe(2);
      expect(servers).toEqual(['server', 'anotherServer']);
    });
  });
});
