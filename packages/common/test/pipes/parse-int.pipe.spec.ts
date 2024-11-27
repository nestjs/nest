import { expect } from 'chai';
import { HttpException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseIntPipe', () => {
  let target: ParseIntPipe;
  beforeEach(() => {
    target = new ParseIntPipe({
      exceptionFactory: (error: any) => new CustomTestError(),
    });
  });
  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return number', async () => {
        const num = '3';
        expect(await target.transform(num, {} as ArgumentMetadata)).to.equal(
          parseInt(num, 10),
        );
      });
      it('should return negative number', async () => {
        const num = '-3';
        expect(await target.transform(num, {} as ArgumentMetadata)).to.equal(
          -3,
        );
      });
      it('should not throw an error if the value is undefined/null and optional is true', async () => {
        const target = new ParseIntPipe({ optional: true });
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
          target.transform('123abc', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
      it('should throw an error when number has wrong number encoding', async () => {
        return expect(
          target.transform('0xFF', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });
  });
});
