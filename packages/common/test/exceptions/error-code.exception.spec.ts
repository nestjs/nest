import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '../../exceptions/index.js';

describe('errorCode in built-in exception response bodies', () => {
  it('should include errorCode in the body of the documented example', () => {
    // https://docs.nestjs.com/exception-filters#machine-readable-error-codes
    const exception = new BadRequestException('Password is too weak', {
      errorCode: 'WEAK_PASSWORD',
    });

    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      message: 'Password is too weak',
      error: 'Bad Request',
      errorCode: 'WEAK_PASSWORD',
    });
  });

  it.each([
    [BadRequestException, 400, 'Bad Request'],
    [UnauthorizedException, 401, 'Unauthorized'],
    [ForbiddenException, 403, 'Forbidden'],
    [NotFoundException, 404, 'Not Found'],
    [ConflictException, 409, 'Conflict'],
    [GoneException, 410, 'Gone'],
    [UnprocessableEntityException, 422, 'Unprocessable Entity'],
    [InternalServerErrorException, 500, 'Internal Server Error'],
  ] as const)(
    '$1 should expose errorCode alongside a string message',
    (ExceptionClass, statusCode, error) => {
      const exception = new ExceptionClass('a message', {
        errorCode: 'SOME_CODE',
      });

      expect(exception.getResponse()).toEqual({
        statusCode,
        message: 'a message',
        error,
        errorCode: 'SOME_CODE',
      });
      expect(exception.errorCode).toBe('SOME_CODE');
    },
  );

  it('should expose errorCode when no message is supplied', () => {
    const exception = new NotFoundException(undefined, {
      errorCode: 'MISSING',
    });

    expect(exception.getResponse()).toEqual({
      statusCode: 404,
      message: 'Not Found',
      errorCode: 'MISSING',
    });
  });

  it('should expose errorCode alongside an array message', () => {
    const exception = new BadRequestException(['first', 'second'], {
      errorCode: 'VALIDATION_FAILED',
    });

    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      message: ['first', 'second'],
      error: 'Bad Request',
      errorCode: 'VALIDATION_FAILED',
    });
  });

  it('should keep both the cause and the errorCode', () => {
    const cause = new Error('root cause');
    const exception = new BadRequestException('a message', {
      cause,
      errorCode: 'WITH_CAUSE',
    });

    expect(exception.cause).toBe(cause);
    expect(exception.errorCode).toBe('WITH_CAUSE');
    expect(exception.getResponse()).toHaveProperty('errorCode', 'WITH_CAUSE');
  });

  it('should omit errorCode when none is provided', () => {
    const exception = new BadRequestException('a message');

    expect(exception.getResponse()).not.toHaveProperty('errorCode');
    expect(exception.errorCode).toBeUndefined();
  });

  it('should omit errorCode when a plain description string is used', () => {
    const exception = new BadRequestException('a message', 'A description');

    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      message: 'a message',
      error: 'A description',
    });
  });

  it('should leave a caller-supplied response object untouched', () => {
    const customBody = { foo: 'bar' };
    const exception = new BadRequestException(customBody, {
      errorCode: 'IGNORED_IN_BODY',
    });

    // A custom object fully overrides the response body, so errorCode is not
    // injected into it; it remains reachable via the `errorCode` property.
    expect(exception.getResponse()).toEqual({ foo: 'bar' });
    expect(customBody).toEqual({ foo: 'bar' });
    expect(exception.errorCode).toBe('IGNORED_IN_BODY');
  });

  it('should not mutate the caller-supplied options object', () => {
    const options = { errorCode: 'FROZEN' };
    Object.freeze(options);

    expect(() => new BadRequestException('a message', options)).not.toThrow();
  });

  it('should still expose errorCode on a direct HttpException', () => {
    const exception = new HttpException('a message', 418, {
      errorCode: 'DIRECT',
    });

    expect(exception.errorCode).toBe('DIRECT');
  });
});
