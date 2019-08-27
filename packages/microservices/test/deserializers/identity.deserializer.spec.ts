import { expect } from 'chai';
import { IdentityDeserializer } from '../../deserializers/identity.deserializer';

describe('IdentityDeserializer', () => {
  let instance: IdentityDeserializer;
  beforeEach(() => {
    instance = new IdentityDeserializer();
  });
  describe('deserialize', () => {
    it('should return the value unchanged', () => {
      const value = {};
      expect(instance.deserialize(value)).to.be.eql(value);
    });
  });
});
