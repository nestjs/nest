import { randomStringGenerator } from '../../utils/random-string-generator.util.js';

describe('randomStringGenerator', () => {
  it('should generate random string', () => {
    expect(randomStringGenerator()).toBeTypeOf('string');
  });
});
