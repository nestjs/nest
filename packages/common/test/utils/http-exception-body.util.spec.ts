import { expect } from 'chai';
import { createHttpExceptionBody } from '../../utils/http-exception-body.util';

describe('createHttpExceptionBody', () => {
  it('should return pre-defined body if message is string', () => {
    expect(createHttpExceptionBody('message', 'error', 200)).to.eql({ message: 'message', error: 'error', statusCode: 200 });
  });

  it('should override pre-defined body if message is object', () => {
    expect(createHttpExceptionBody({ test: 'object' }, 'error', 200)).to.eql({ test: 'object' });
  });

  it('should not override pre-defined body if message is array', () => {
    expect(createHttpExceptionBody(['a', 'random', 'array'], 'error', 200)).to.eql({ message: ['a', 'random', 'array'], error: 'error', statusCode: 200 });
  });
});
