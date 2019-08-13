import { expect } from 'chai';
import { randomStringGenerator } from '../../src/utils/random-string-generator.util';

describe('randomStringGenerator', () => {
  it('should generate random string', () => {
    expect(randomStringGenerator()).to.be.string;
  });
});
