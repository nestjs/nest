import { expect } from 'chai';

import { IdentitySerializer } from '../../serializers/identity.serializer';

describe('IdentitySerializer', () => {
  let instance: IdentitySerializer;
  beforeEach(() => {
    instance = new IdentitySerializer();
  });
  describe('serialize', () => {
    it('should return the value unchanged', () => {
      const value = {};
      expect(instance.serialize(value)).to.be.eql(value);
    });
  });
});
