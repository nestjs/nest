import { NatsContext } from '../../ctx-host';

describe('NatsContext', () => {
  const args: [string, any] = ['test', {}];
  let context: NatsContext;

  beforeEach(() => {
    context = new NatsContext(args);
  });
  describe('getSubject', () => {
    it('should return subject', () => {
      expect(context.getSubject()).toEqual(args[0]);
    });
  });
  describe('getHeaders', () => {
    it('should return headers', () => {
      expect(context.getHeaders()).toEqual(args[1]);
    });
  });
});
