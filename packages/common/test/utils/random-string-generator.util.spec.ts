import { randomStringGenerator } from '../../utils/random-string-generator.util';

describe('randomStringGenerator', () => {
  it('should generate random string', () => {
    expect(typeof randomStringGenerator()).toBe('string');
  });
});
