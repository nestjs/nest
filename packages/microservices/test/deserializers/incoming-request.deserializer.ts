import { expect } from 'chai';
import { IncomingRequestDeserializer } from '../../deserializers/incoming-request.deserializer';
import { IncomingRequest } from '../../interfaces';

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
        expect(instance.deserialize(incomingRequest)).to.be.equal(
          incomingRequest,
        );
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
          expect(
            instance.deserialize(externalRequest, options),
          ).to.be.deep.equal({
            pattern: options.channel,
            data: externalRequest,
          });
        });
      });
      describe('when options are undefined', () => {
        it('should map to proper schema with undefined values', () => {
          expect(instance.deserialize({})).to.be.deep.equal({
            pattern: undefined,
            data: undefined,
          });
        });
      });
    });
  });
});
