import { RmqContext } from '../../ctx-host/index.js';

describe('RmqContext', () => {
  const args = [{ test: true }, 'test', 'pattern'];
  let context: RmqContext;

  beforeEach(() => {
    context = new RmqContext(args as [Record<string, any>, any, string]);
  });
  describe('getMessage', () => {
    it('should return original message', () => {
      expect(context.getMessage()).toEqual(args[0]);
    });
  });
  describe('getChannelRef', () => {
    it('should return channel reference', () => {
      expect(context.getChannelRef()).toEqual(args[1]);
    });
  });
  describe('getPattern', () => {
    it('should return pattern', () => {
      expect(context.getPattern()).toEqual(args[2]);
    });
  });
  describe('getMetadata', () => {
    it('should return the string-valued headers of the message', () => {
      const message = {
        properties: {
          headers: {
            'x-request-id': 'trace-1',
            'x-retry-count': 3,
            'x-death': [{ count: 1 }],
            'x-binary': Buffer.from('abc'),
            'x-first-death-queue': 'orders',
          },
        },
      };

      expect(new RmqContext([message, {}, 'pattern']).getMetadata()).toEqual({
        'x-request-id': 'trace-1',
        'x-first-death-queue': 'orders',
      });
    });
    it('should return undefined for a message without headers', () => {
      expect(
        new RmqContext([{ properties: {} }, {}, 'pattern']).getMetadata(),
      ).toBeUndefined();
      expect(context.getMetadata()).toBeUndefined();
    });
  });
});
