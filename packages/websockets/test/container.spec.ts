import hash from 'object-hash';
import { SocketsContainer } from '../sockets-container.js';

describe('SocketsContainer', () => {
  const port = 30;

  let instance: SocketsContainer;
  let getSpy: ReturnType<typeof vi.fn>, setSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setSpy = vi.fn();
    getSpy = vi.fn();
    instance = new SocketsContainer();
    (instance as any).serverAndEventStreamsHosts = {
      get: getSpy,
      set: setSpy,
    };
  });
  describe('getSocketEventsHostByPort', () => {
    it(`should call "serverAndEventStreamsHosts" get method with expected arguments`, () => {
      const config = { port, path: 'random' };
      instance.getOneByConfig(config);

      const token = hash(config);
      expect(getSpy).toHaveBeenCalledWith(token);
    });
  });
  describe('addOne', () => {
    it(`should call "serverAndEventStreamsHosts" set method with expected arguments`, () => {
      const server = {};
      const config = { port, path: 'random' };

      instance.addOne(config, server as any);

      const token = hash(config);
      expect(setSpy).toHaveBeenCalledWith(token, server);
    });
  });
  describe('getAll', () => {
    it('should return "serverAndEventStreamsHosts"', () => {
      const collection = ['test'];
      (instance as any).serverAndEventStreamsHosts = collection;
      expect(instance.getAll()).toBe(collection);
    });
  });
  describe('clear', () => {
    it('should clear hosts collection', () => {
      const collection = { clear: vi.fn() };
      (instance as any).serverAndEventStreamsHosts = collection;
      instance.clear();
      expect(collection.clear).toHaveBeenCalled();
    });
  });
});
