import { expect } from 'chai';

import { forwardRef } from '../../utils/forward-ref.util';

describe('forwardRef', () => {
  it('should return object with forwardRef property', () => {
    const fn = () => ({});
    const referenceFn = forwardRef(() => fn);
    expect(referenceFn.forwardRef()).to.be.eql(fn);
  });
});
