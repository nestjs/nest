import { IncomingResponseDeserializer } from '../../deserializers/incoming-response.deserializer.js';
import { IncomingResponse } from '../../interfaces/index.js';

describe('IncomingResponseDeserializer', () => {
  let instance: IncomingResponseDeserializer;
  beforeEach(() => {
    instance = new IncomingResponseDeserializer();
  });
  describe('deserialize', () => {
    describe('when response is not external', () => {
      it('should return the same value unchanged', () => {
        const incomingResponse: IncomingResponse = {
          id: '1',
          response: {},
        };
        const errResponse: IncomingResponse = {
          id: '1',
          err: {},
        };
        expect(instance.deserialize(incomingResponse)).toBe(incomingResponse);
        expect(instance.deserialize(errResponse)).toBe(errResponse);
      });
    });
    describe('otherwise', () => {
      it('should map to the internal schema', () => {
        const externalResponse = {
          id: '1',
          array: [1, 2, 3],
        };
        expect(instance.deserialize(externalResponse)).toEqual({
          id: externalResponse.id,
          isDisposed: true,
          response: externalResponse,
        });
      });

      it('should map an external payload that happens to include a response field', () => {
        const externalResponse = {
          uuid: 'e78be5a4-03c5-4448-bde9-c7e78f41ffe1',
          code: 'SMF-8000-YX',
          response: 'The service has been placed into the maintenance state.',
          eventType: 'suspect',
        };
        expect(instance.deserialize(externalResponse)).toStrictEqual({
          id: undefined,
          isDisposed: true,
          response: externalResponse,
        });
      });
    });
  });

  describe('isExternal', () => {
    describe('when every key belongs to the envelope', () => {
      it('should not treat a RabbitMQ reply as external', () => {
        expect(instance.isExternal({ response: 'ping/pong' })).toBe(false);
        expect(instance.isExternal({ err: 'boom' })).toBe(false);
        expect(instance.isExternal({ isDisposed: true })).toBe(false);
      });

      it('should not treat a completion packet as external', () => {
        expect(instance.isExternal({ id: '1', isDisposed: true })).toBe(false);
      });

      it('should not treat a no-handler packet as external', () => {
        expect(
          instance.isExternal({ id: '1', err: 'no handler', status: 'error' }),
        ).toBe(false);
      });
    });

    describe('otherwise', () => {
      it('should treat a payload with an unknown key as external', () => {
        expect(instance.isExternal({ id: '1', array: [1, 2, 3] })).toBe(true);
      });

      it('should treat non-objects as external', () => {
        expect(instance.isExternal(42)).toBe(true);
        expect(instance.isExternal(null)).toBe(true);
      });
    });
  });
});
