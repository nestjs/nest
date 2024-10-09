import { combineStackTrace } from '@nestjs/core/helpers/combine-stack-trace';
import { expect } from 'chai';

describe(combineStackTrace.name, () => {
  it('returns error stack trace as-is when error has no cause', () => {
    const error = new Error('Something went wrong');

    const stack = combineStackTrace(error);

    expect(stack).to.equal(error.stack);
  });

  it('appends error stack trace with that of its cause', () => {
    const cause = new Error('Request failed with HTTP 400');
    const error = errorWithCause('Something went wrong', cause);

    const stack = combineStackTrace(error);

    expect(stack.startsWith(error.stack)).to.be.true;
    expect(stack.endsWith(cause.stack)).to.be.true;
    expect(stack.includes('Caused by Error: Request failed with HTTP 400')).to
      .be.true;
  });

  it('recursively appends stack traces', () => {
    const cause = new Error('Request failed with HTTP 400');
    const error = errorWithCause('Unable to retrieve data', cause);
    const caught = errorWithCause('Something went wrong', error);

    const stack = combineStackTrace(caught);

    expect(stack.includes('Caused by Error: Unable to retrieve data')).to.be
      .true;
    expect(stack.includes('Caused by Error: Request failed with HTTP 400')).to
      .be.true;
  });
});

function errorWithCause(message: string, cause: unknown): Error {
  // @ts-expect-error - Error options have been introduced in ES2022.
  return new Error(message, { cause });
}
