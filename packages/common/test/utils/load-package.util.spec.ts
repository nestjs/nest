import { expect } from 'chai';
import { loadPackage } from '../../utils/load-package.util';

describe('loadPackage', () => {
  describe('when package is available', () => {
    it('should return package', () => {
      expect(loadPackage('reflect-metadata', 'ctx')).to.be.eql(
        require('reflect-metadata'),
      );
    });
  });
});
