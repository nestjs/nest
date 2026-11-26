import { NotFoundException } from '@nestjs/common';
import { withoutStackTrace } from '../../helpers/without-stack-trace.js';

describe('withoutStackTrace', () => {
  it('should create the error without stack frames', () => {
    const error = withoutStackTrace(
      () => new NotFoundException('Cannot GET /unknown'),
    );

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.stack).toBe('NotFoundException: Cannot GET /unknown');
  });

  it('should restore Error.stackTraceLimit', () => {
    const { stackTraceLimit } = Error;

    withoutStackTrace(() => new Error());

    expect(Error.stackTraceLimit).toBe(stackTraceLimit);
    expect(new Error().stack).toContain('\n    at ');
  });

  it('should restore Error.stackTraceLimit when creating the error throws', () => {
    const { stackTraceLimit } = Error;

    expect(() =>
      withoutStackTrace(() => {
        throw new TypeError('failed');
      }),
    ).toThrow('failed');
    expect(Error.stackTraceLimit).toBe(stackTraceLimit);
  });

  it('should leave Error.stackTraceLimit alone when it is read-only', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Error,
      'stackTraceLimit',
    )!;
    Object.defineProperty(Error, 'stackTraceLimit', {
      ...descriptor,
      writable: false,
    });
    try {
      const error = withoutStackTrace(() => new Error('read-only'));

      expect(error.stack).toContain('\n    at ');
    } finally {
      Object.defineProperty(Error, 'stackTraceLimit', descriptor);
    }
  });
});
