import * as sinon from 'sinon';
import { expect } from 'chai';
import { ArgumentMetadata } from '../../interfaces';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { HttpException } from '../../exceptions';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseIntPipe', () => {
  let target: ParseIntPipe;
  let min: number | undefined;
  let max: number | undefined;

  beforeEach(() => {
    target = new ParseIntPipe({
      exceptionFactory: (error: any) => new CustomTestError(),
      min,
      max,
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

      it('should return zero', async () => {
        const num = '0';
        expect(await target.transform(num, {} as ArgumentMetadata)).to.equal(0);
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

    describe('when a minimum allowed value is provided', () => {
      before(() => {
        min = 0;
      });

      after(() => {
        min = undefined;
      });

      it('should throw an error when number is less than minimum', async () => {
        return expect(
          target.transform('-1', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });

      it('should return the parsed number when number is equal to the minimum', async () => {
        return expect(
          await target.transform('0', {} as ArgumentMetadata),
        ).to.equal(0);
      });

      it('should return the parsed number when number is greater than minimum', async () => {
        return expect(
          await target.transform('4', {} as ArgumentMetadata),
        ).to.equal(4);
      });
    });

    describe('when a maximum allowed value is provided', () => {
      before(() => {
        max = 3;
      });

      after(() => {
        max = undefined;
      });

      it('should throw an error when number is greater than maximum', async () => {
        return expect(
          target.transform('4', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });

      it('should return the parsed number when number is equal to the maximum', async () => {
        return expect(
          await target.transform('3', {} as ArgumentMetadata),
        ).to.equal(3);
      });

      it('should return the parsed number when number is less than maximum', async () => {
        return expect(
          await target.transform('1', {} as ArgumentMetadata),
        ).to.equal(1);
      });
    });
  });
});
