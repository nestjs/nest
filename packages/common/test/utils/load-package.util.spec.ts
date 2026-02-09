import { expect } from 'chai';
import { loadPackage } from '../../utils/load-package.util.js';

describe('loadPackage', () => {
  describe('when package is available', () => {
    it('should return package', async () => {
      const result = await loadPackage('reflect-metadata', 'ctx');
      const expected = await import('reflect-metadata');
      expect(result).to.be.eql(expected);
    });
  });
});
