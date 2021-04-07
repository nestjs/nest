import { expect } from 'chai';

import { IncomingResponseDeserializer } from '../../deserializers/incoming-response.deserializer';
import { IncomingResponse } from '../../interfaces';

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
        expect(instance.deserialize(incomingResponse)).to.be.equal(
          incomingResponse,
        );
        expect(instance.deserialize(errResponse)).to.be.equal(errResponse);
      });
    });
    describe('otherwise', () => {
      it('should map to the internal schema', () => {
        const externalResponse = {
          id: '1',
          array: [1, 2, 3],
        };
        expect(instance.deserialize(externalResponse)).to.be.deep.equal({
          id: externalResponse.id,
          isDisposed: true,
          response: externalResponse,
        });
      });
    });
  });
});
