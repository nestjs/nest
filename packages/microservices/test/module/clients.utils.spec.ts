import { expect } from 'chai';
import { getClientToken } from '../../module';
import { DEFAULT_CLIENT } from '../../module/clients.constants';

describe('getClientToken()', () => {
  describe('when name is not undefined', () => {
    it('should return expected token', () => {
      expect(getClientToken('name')).to.be.eql('NAME_CLIENT');
    });
  });
  describe('when name is undefined', () => {
    it('should return default token', () => {
      expect(getClientToken()).to.be.eql(DEFAULT_CLIENT);
    });
  });
});
