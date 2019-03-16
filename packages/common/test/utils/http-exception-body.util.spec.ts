import { expect } from 'chai';
import { createHttpExceptionBody } from '../../utils/http-exception-body.util';

describe('createHttpExceptionBody', () => {
  describe('when object has been passed', () => {
    it('should return expected object', () => {
      const object = {
        message: 'test',
      };
      expect(createHttpExceptionBody(object)).to.be.eql(object);
    });
  });
  describe('when string has been passed', () => {
    it('should return expected object', () => {
      const message = 'test';
      const status = 500;
      const error = 'error';
      expect(createHttpExceptionBody(message, error, status)).to.be.eql({
        message,
        error,
        statusCode: status,
      });
    });
  });
  describe('when nil has been passed', () => {
    it('should return expected object', () => {
      const status = 500;
      const error = 'error';
      expect(createHttpExceptionBody(null, error, status)).to.be.eql({
        error,
        statusCode: status,
      });
    });
  });
  it('should not override pre-defined body if message is array', () => {
    expect(
      createHttpExceptionBody(['a', 'random', 'array'], 'error', 200),
    ).to.eql({
      message: ['a', 'random', 'array'],
      error: 'error',
      statusCode: 200,
    });
  });
});
