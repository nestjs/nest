import { expect } from 'chai';
import { randomStringGenerator } from '../../utils/random-string-generator.util';

describe('randomStringGenerator', () => {
  it('should generate random string', () => {
    expect(randomStringGenerator()).to.be.a('string');
  });
});
