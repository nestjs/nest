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
      describe('when an external payload happens to include envelope keys', () => {
        it('should map an external event that includes a data field', () => {
          const externalEvent = {
            type: 'alert',
            data: {
              severity: 'major',
            },
          };
          const options = {
            channel: 'test',
          };
          expect(instance.deserialize(externalEvent, options)).toEqual({
            pattern: options.channel,
            data: externalEvent,
          });
        });
        it('should map an external event that includes a pattern field', () => {
          const externalEvent = {
            pattern: 'other',
            payload: 'x',
          };
          const options = {
            channel: 'test',
          };
          expect(instance.deserialize(externalEvent, options)).toEqual({
            pattern: options.channel,
            data: externalEvent,
          });
        });
        it('should keep native event packets unchanged', () => {
          const incomingEvent = {
            pattern: 'pattern',
            data: [],
          };
          expect(instance.deserialize(incomingEvent)).toBe(incomingEvent);
        });
      });
    });
  });
});
