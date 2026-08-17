import { forwardRef } from '../../utils/forward-ref.util.js';

describe('forwardRef', () => {
  it('should return object with forwardRef property', () => {
    const fn = () => ({});
    const referenceFn = forwardRef(() => fn);
    expect(referenceFn.forwardRef()).toEqual(fn);
  });
});
