import * as sinon from 'sinon';
import { expect } from 'chai';
import { ArgumentMetadata } from '../../interfaces';
import { ParseFloatPipe } from '../../pipes/parse-float.pipe';
import { HttpException } from '../../exceptions';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseFloatPipe', () => {
  let target: ParseFloatPipe;
  let min: number | undefined;
  let max: number | undefined;

  beforeEach(() => {
    target = new ParseFloatPipe({
      exceptionFactory: (error: any) => new CustomTestError(),
      min,
      max,
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

      it('should return negative number', async () => {
        const num = '-3.33';
        expect(await target.transform(num, {} as ArgumentMetadata)).to.equal(
          -3.33,
        );
      });

      it('should return zero', async () => {
        const num = '0';
        expect(await target.transform(num, {} as ArgumentMetadata)).to.equal(0);
      });
    });

    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(
          target.transform('123.123abc', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });

    describe('when a minimum allowed value is provided', () => {
      before(() => {
        min = 5.33;
      });

      after(() => {
        min = undefined;
      });

      it('should throw an error when number is less than minimum', async () => {
        return expect(
          target.transform('-1.09', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });

      it('should return the parsed number when number is equal to the minimum', async () => {
        return expect(
          await target.transform('5.33', {} as ArgumentMetadata),
        ).to.equal(5.33);
      });

      it('should return the parsed number when number is greater than minimum', async () => {
        return expect(
          await target.transform('6.07', {} as ArgumentMetadata),
        ).to.equal(6.07);
      });
    });

    describe('when a maximum allowed value is provided', () => {
      before(() => {
        max = 5.33;
      });

      after(() => {
        max = undefined;
      });

      it('should throw an error when number is greater than maximum', async () => {
        return expect(
          target.transform('6.07', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });

      it('should return the parsed number when number is equal to the maximum', async () => {
        return expect(
          await target.transform('5.33', {} as ArgumentMetadata),
        ).to.equal(5.33);
      });

      it('should return the parsed number when number is less than maximum', async () => {
        return expect(
          await target.transform('4.99', {} as ArgumentMetadata),
        ).to.equal(4.99);
      });
    });
  });
});
