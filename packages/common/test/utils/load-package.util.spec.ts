import { expect } from 'chai';
import {
  loadPackage,
  MissingRequiredDependencyException,
} from './../../utils/load-package.util';

describe('loadPackage', () => {
  describe('when package is available', () => {
    it('should return package', () => {
      expect(loadPackage('reflect-metadata', 'ctx')).to.be.eql(
        require('reflect-metadata'),
      );
    });
  });
  describe('when package is unavailable', () => {
    it('should throw exception', () => {
      expect(() => loadPackage('unavailable-package', 'ctx')).to.throws(
        MissingRequiredDependencyException,
      );
    });
  });
});
