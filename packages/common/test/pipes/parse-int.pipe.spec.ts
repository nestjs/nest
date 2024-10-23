import { expect } from 'chai';
import { ArgumentMetadata } from '../../interfaces';
import { ParseIntPipe } from '../../pipes/parse-int.pipe';
import { BadRequestException, HttpException } from '../../exceptions';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseIntPipe', () => {
  let target: ParseIntPipe;
  beforeEach(() => {
    target = new ParseIntPipe();
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
        const value = await target.transform(undefined, {} as ArgumentMetadata);
        expect(value).to.equal(undefined);
      });
    });
    describe('when validation fails', () => {
      it('should mention the field name in the error', async () => {
        return expect(
          target.transform('123abc', { data: 'foo' } as ArgumentMetadata),
        ).to.be.rejectedWith(/.*Validation failed.*"foo".*/);
      });
      it('should throw an error', async () => {
        return expect(
          target.transform('123abc', {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
      });
      it('should throw an error when number has wrong number encoding', async () => {
        return expect(
          target.transform('0xFF', {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
      });
    });
    describe('with an exceptionFactory', () => {
      beforeEach(() => {
        target = new ParseIntPipe({
          exceptionFactory: (error: any) => new CustomTestError(),
        });
      });
      it('uses it when the validation fails', async () => {
        return expect(
          target.transform('123abc', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });
  });
});
