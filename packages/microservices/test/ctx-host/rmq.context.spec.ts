import { RmqContext } from '../../ctx-host';

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
});
