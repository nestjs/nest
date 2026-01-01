import { expect } from 'chai';
import { HttpException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ParseStringPipe } from '../../pipes/parse-string.pipe';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseStringPipe', () => {
  let target: ParseStringPipe;
  const metadata = {} as ArgumentMetadata;

  beforeEach(() => {
    target = new ParseStringPipe({
      exceptionFactory: () => new CustomTestError(),
    });
  });

  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return trimmed string', async () => {
        const value = '  nestjs ';
        expect(await target.transform(value, metadata)).to.equal('nestjs');
      });

      it('should not throw an error if the value is undefined/null and optional is true', async () => {
        const optionalTarget = new ParseStringPipe({ optional: true });
        const value = await optionalTarget.transform(undefined!, metadata);
        expect(value).to.equal(undefined);
      });
    });

    describe('when validation fails', () => {
      it('should throw an error if value is not a string', async () => {
        return expect(
          target.transform(123 as any, metadata),
        ).to.be.rejectedWith(CustomTestError);
      });

      it('should throw an error if string is empty after trimming', async () => {
        return expect(target.transform('   ', metadata)).to.be.rejectedWith(
          CustomTestError,
        );
      });
    });
  });
});
