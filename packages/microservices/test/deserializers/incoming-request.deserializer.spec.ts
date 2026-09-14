import { IncomingRequestDeserializer } from '../../deserializers/incoming-request.deserializer.js';
import { IncomingRequest } from '../../interfaces/index.js';

describe('IncomingRequestDeserializer', () => {
  let instance: IncomingRequestDeserializer;
  beforeEach(() => {
    instance = new IncomingRequestDeserializer();
  });
  describe('deserialize', () => {
    describe('when response is not external', () => {
      it('should return the same value unchanged', () => {
        const incomingRequest: IncomingRequest = {
          id: '1',
          pattern: 'pattern',
          data: [],
        };
        expect(instance.deserialize(incomingRequest)).toBe(incomingRequest);
      });
    });
    describe('otherwise', () => {
      describe('when options are passed in', () => {
        it('should map to the internal schema', () => {
          const externalRequest = {
            array: [1, 2, 3],
          };
          const options = {
            channel: 'test',
          };
          expect(instance.deserialize(externalRequest, options)).toEqual({
            pattern: options.channel,
            data: externalRequest,
          });
        });
      });
      describe('when options are undefined', () => {
        it('should map to proper schema with undefined values', () => {
          expect(instance.deserialize({})).toEqual({
            pattern: undefined,
            data: undefined,
          });
        });
      });
    });
  });
  describe('with the strictRequestEnvelope option', () => {
    let strict: IncomingRequestDeserializer;
    beforeEach(() => {
      strict = new IncomingRequestDeserializer({ strictRequestEnvelope: true });
    });
    describe('when a packet carries a key outside the request envelope', () => {
      it('should treat the packet as a foreign message and wrap it', () => {
        const foreignPayload = {
          type: 'alert',
          data: { reason: 'disk full' },
        };
        expect(
          strict.deserialize(foreignPayload, { channel: 'alerts' }),
        ).toEqual({
          pattern: 'alerts',
          data: foreignPayload,
        });
      });
      it('should keep the legacy gate when the option is not set', () => {
        const foreignPayload = {
          type: 'alert',
          data: { reason: 'disk full' },
        };
        expect(instance.deserialize(foreignPayload)).toBe(foreignPayload);
      });
    });
    describe('when a packet carries only envelope keys', () => {
      it('should leave a bare data packet untouched', () => {
        const bareDataPacket = { data: { reason: 'disk full' } };
        expect(strict.deserialize(bareDataPacket)).toBe(bareDataPacket);
      });
      it('should leave a request packet untouched', () => {
        const nativeRequest = { id: '1', pattern: 'users.find', data: [] };
        expect(strict.deserialize(nativeRequest)).toBe(nativeRequest);
      });
      it('should leave an event packet untouched', () => {
        const nativeEvent = { pattern: 'user.created', data: { id: 1 } };
        expect(strict.deserialize(nativeEvent)).toBe(nativeEvent);
      });
      it('should map an empty packet to the internal schema', () => {
        expect(strict.deserialize({}, { channel: 'alerts' })).toEqual({
          pattern: 'alerts',
          data: {},
        });
      });
      it('should treat scalar payloads the same way as the default mode', () => {
        expect(strict.deserialize('ping', { channel: 'alerts' })).toEqual({
          pattern: 'alerts',
          data: 'ping',
        });
      });
    });
  });
});
