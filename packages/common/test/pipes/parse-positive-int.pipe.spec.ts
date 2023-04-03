import { expect } from 'chai';
import { ArgumentMetadata } from '../../interfaces';
import { ParsePositiveIntPipe } from '../../pipes/parse-positive-int.pipe';
import { HttpException } from '../../exceptions';
import { HttpStatus } from '../../enums';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', HttpStatus.I_AM_A_TEAPOT);
  }
}

describe('ParsePositiveIntPipe', () => {
  let target: ParsePositiveIntPipe;
  beforeEach(() => {
    target = new ParsePositiveIntPipe({
      exceptionFactory: (error: any) => new CustomTestError(),
    });
  });
  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return positive number', async () => {
        const num = '3';
        expect(await target.transform(num, {} as ArgumentMetadata)).to.equal(
          parseInt(num, 10),
        );
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
      it('should throw an error when negative number', async () => {
        return expect(
          target.transform('-3', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
      it('should throw an error when negative float', async () => {
        return expect(
          target.transform('-3.1', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
      it('should throw an error when positive float', async () => {
        return expect(
          target.transform('3.1', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });
  });
});
