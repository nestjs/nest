import { expect } from 'chai';

import { DefaultValuePipe } from '../../pipes/default-value.pipe';

describe('DefaultValuePipe', () => {
  const defaultValue = 'default';
  const target = new DefaultValuePipe(defaultValue);

  describe('transform', () => {
    it('should return original value if one was provided', () => {
      const value = 'value';
      const result = target.transform(value);
      expect(result).to.equal(value);
    });

    it('should return default value if no value was provided', () => {
      const result = target.transform(undefined);
      expect(result).to.equal(defaultValue);
    });
  });
});
