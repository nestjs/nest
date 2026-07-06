import { expect } from 'chai';
import { HttpException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ParseFloatPipe } from '../../pipes/parse-float.pipe';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseFloatPipe', () => {
  let target: ParseFloatPipe;
  beforeEach(() => {
    target = new ParseFloatPipe({
      exceptionFactory: (error: any) => new CustomTestError(),
    });
  });
  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return number', async () => {
        const num = '3.33';
        expect(await target.transform(num, {} as ArgumentMetadata)).to.equal(
          parseFloat(num),
        );
      });
      it('should not throw an error if the value is undefined/null and optional is true', async () => {
        const target = new ParseFloatPipe({ optional: true });
        const value = await target.transform(
          undefined!,
          {} as ArgumentMetadata,
        );
        expect(value).to.equal(undefined);
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(
          target.transform('123.123abc', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
      it('should throw an error for hex string', async () => {
        return expect(
          target.transform('0xFF', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
      it('should throw an error for binary string', async () => {
        return expect(
          target.transform('0b101', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
      it('should throw an error for Infinity', async () => {
        return expect(
          target.transform('Infinity', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
      it('should throw an error for -Infinity', async () => {
        return expect(
          target.transform('-Infinity', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });
  });
});
