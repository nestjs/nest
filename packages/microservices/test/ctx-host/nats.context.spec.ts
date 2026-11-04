import { headers as createHeaders } from '@nats-io/transport-node';
import { NatsContext } from '../../ctx-host/index.js';

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
  describe('getMetadata', () => {
    it('should return the headers with a single value', () => {
      const headers = createHeaders();
      headers.set('x-request-id', 'trace-1');
      headers.set('Tenant', 'acme');

      const metadata = new NatsContext(['test', headers]).getMetadata();

      expect(metadata).toEqual({ 'x-request-id': 'trace-1', Tenant: 'acme' });
    });
    it('should leave out a header with several values', () => {
      const headers = createHeaders();
      headers.set('x-request-id', 'trace-1');
      headers.append('x-tag', 'a');
      headers.append('x-tag', 'b');

      expect(new NatsContext(['test', headers]).getMetadata()).toEqual({
        'x-request-id': 'trace-1',
      });
    });
    it('should return undefined for a message without headers', () => {
      expect(
        new NatsContext(['test', undefined]).getMetadata(),
      ).toBeUndefined();
    });
  });
});
