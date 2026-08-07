import { expect } from 'chai';
import { HttpStatus } from '../../enums';
import { HttpErrorByCode } from '../../utils/http-error-by-code.util';

describe('HttpErrorByCode', () => {
  const entries = Object.entries(HttpErrorByCode) as [
    string,
    new (...args: any[]) => any,
  ][];

  it('should have an entry for every ErrorHttpStatusCode', () => {
    const expectedCodes = [
      HttpStatus.BAD_GATEWAY,
      HttpStatus.BAD_REQUEST,
      HttpStatus.CONFLICT,
      HttpStatus.FORBIDDEN,
      HttpStatus.GATEWAY_TIMEOUT,
      HttpStatus.GONE,
      HttpStatus.HTTP_VERSION_NOT_SUPPORTED,
      HttpStatus.I_AM_A_TEAPOT,
      HttpStatus.INTERNAL_SERVER_ERROR,
      HttpStatus.METHOD_NOT_ALLOWED,
      HttpStatus.MISDIRECTED,
      HttpStatus.NOT_ACCEPTABLE,
      HttpStatus.NOT_FOUND,
      HttpStatus.NOT_IMPLEMENTED,
      HttpStatus.PAYLOAD_TOO_LARGE,
      HttpStatus.PRECONDITION_FAILED,
      HttpStatus.REQUEST_TIMEOUT,
      HttpStatus.SERVICE_UNAVAILABLE,
      HttpStatus.UNAUTHORIZED,
      HttpStatus.UNPROCESSABLE_ENTITY,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    ];
    expect(entries.length).to.equal(expectedCodes.length);
  });

  it('should map every code to a class that extends HttpException', () => {
    for (const [, ExceptionClass] of entries) {
      const instance = new ExceptionClass();
      expect(instance).to.have.property('getStatus');
      expect(instance.getStatus()).to.be.a('number');
    }
  });

  it('should map the correct status code for each entry', () => {
    for (const [codeStr, ExceptionClass] of entries) {
      const code = Number(codeStr);
      const instance = new ExceptionClass();
      expect(instance.getStatus()).to.equal(code);
    }
  });

  it('should set the correct default message for MisdirectedException', () => {
    const instance = new (HttpErrorByCode[HttpStatus.MISDIRECTED] as any)();
    expect(instance.message).to.equal('Misdirected');
  });

  it('should set the correct default message for HttpVersionNotSupportedException', () => {
    const instance = new (HttpErrorByCode[
      HttpStatus.HTTP_VERSION_NOT_SUPPORTED
    ] as any)();
    expect(instance.message).to.equal('HTTP Version Not Supported');
  });
});
