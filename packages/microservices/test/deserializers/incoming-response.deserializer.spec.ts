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

      it('should map to the internal schema when external payload contains a response property', () => {
        const externalPayloadWithResponse = {
          uuid: 'e78be5a4-03c5-4448-bde9-c7e78f41ffe1',
          code: 'SMF-8000-YX',
          type: 'defect',
          severity: 'major',
          description: 'A service failed',
          response: 'The service has been placed into the maintenance state.',
          impact: 'svc:/network/nats-server:default is unavailable.',
          eventId: '0abba058-0036-4fc4-8464-104d05150946:342',
        };
        expect(instance.deserialize(externalPayloadWithResponse)).toEqual({
          id: undefined,
          isDisposed: true,
          response: externalPayloadWithResponse,
        });
      });

      it('should map to the internal schema when external payload has id, response, and extra fields', () => {
        const payload = {
          id: '1',
          response: 'OK',
          timestamp: 1600000000,
        };
        expect(instance.deserialize(payload)).toEqual({
          id: payload.id,
          isDisposed: true,
          response: payload,
        });
      });

      it('should map to the internal schema when payload only has response but no id or isDisposed', () => {
        const payload = {
          response: 'hello',
        };
        expect(instance.deserialize(payload)).toEqual({
          id: undefined,
          isDisposed: true,
          response: payload,
        });
      });

      it('should map primitives and arrays to the internal schema', () => {
        expect(instance.deserialize('plain string')).toEqual({
          id: undefined,
          isDisposed: true,
          response: 'plain string',
        });
        expect(instance.deserialize([1, 2, 3])).toEqual({
          id: undefined,
          isDisposed: true,
          response: [1, 2, 3],
        });
        expect(instance.deserialize(42)).toEqual({
          id: undefined,
          isDisposed: true,
          response: 42,
        });
      });
    });
  });
});
