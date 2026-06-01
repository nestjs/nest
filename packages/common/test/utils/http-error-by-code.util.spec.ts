import { expect } from 'chai';
import { HttpStatus } from '../../enums';
import { HttpErrorByCode } from '../../utils/http-error-by-code.util';
import { BadGatewayException } from '../../exceptions/bad-gateway.exception';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { ConflictException } from '../../exceptions/conflict.exception';
import { ForbiddenException } from '../../exceptions/forbidden.exception';
import { GatewayTimeoutException } from '../../exceptions/gateway-timeout.exception';
import { GoneException } from '../../exceptions/gone.exception';
import { ImATeapotException } from '../../exceptions/im-a-teapot.exception';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';
import { MethodNotAllowedException } from '../../exceptions/method-not-allowed.exception';
import { NotAcceptableException } from '../../exceptions/not-acceptable.exception';
import { NotFoundException } from '../../exceptions/not-found.exception';
import { NotImplementedException } from '../../exceptions/not-implemented.exception';
import { PayloadTooLargeException } from '../../exceptions/payload-too-large.exception';
import { PreconditionFailedException } from '../../exceptions/precondition-failed.exception';
import { RequestTimeoutException } from '../../exceptions/request-timeout.exception';
import { ServiceUnavailableException } from '../../exceptions/service-unavailable.exception';
import { UnauthorizedException } from '../../exceptions/unauthorized.exception';
import { UnprocessableEntityException } from '../../exceptions/unprocessable-entity.exception';
import { UnsupportedMediaTypeException } from '../../exceptions/unsupported-media-type.exception';

describe('HttpErrorByCode', () => {
  const testCases: [HttpStatus, new (...args: unknown[]) => unknown][] = [
    [HttpStatus.BAD_GATEWAY, BadGatewayException],
    [HttpStatus.BAD_REQUEST, BadRequestException],
    [HttpStatus.CONFLICT, ConflictException],
    [HttpStatus.FORBIDDEN, ForbiddenException],
    [HttpStatus.GATEWAY_TIMEOUT, GatewayTimeoutException],
    [HttpStatus.GONE, GoneException],
    [HttpStatus.I_AM_A_TEAPOT, ImATeapotException],
    [HttpStatus.INTERNAL_SERVER_ERROR, InternalServerErrorException],
    [HttpStatus.METHOD_NOT_ALLOWED, MethodNotAllowedException],
    [HttpStatus.NOT_ACCEPTABLE, NotAcceptableException],
    [HttpStatus.NOT_FOUND, NotFoundException],
    [HttpStatus.NOT_IMPLEMENTED, NotImplementedException],
    [HttpStatus.PAYLOAD_TOO_LARGE, PayloadTooLargeException],
    [HttpStatus.PRECONDITION_FAILED, PreconditionFailedException],
    [HttpStatus.REQUEST_TIMEOUT, RequestTimeoutException],
    [HttpStatus.SERVICE_UNAVAILABLE, ServiceUnavailableException],
    [HttpStatus.UNAUTHORIZED, UnauthorizedException],
    [HttpStatus.UNPROCESSABLE_ENTITY, UnprocessableEntityException],
    [HttpStatus.UNSUPPORTED_MEDIA_TYPE, UnsupportedMediaTypeException],
  ];

  it('should map each HTTP status code to the correct exception class', () => {
    testCases.forEach(([code, ExceptionClass]) => {
      expect(HttpErrorByCode[code]).to.equal(ExceptionClass);
    });
  });

  it('should have exactly one entry per test case', () => {
    expect(Object.keys(HttpErrorByCode).length).to.equal(testCases.length);
  });

  it('each mapped exception should be constructible', () => {
    testCases.forEach(([, ExceptionClass]) => {
      expect(() => new ExceptionClass()).to.not.throw();
    });
  });
});
