import * as sinon from 'sinon';
import { expect } from 'chai';
import { ArgumentMetadata } from '../../interfaces';
import { ParseFloatPipe } from '../../pipes/parse-float.pipe';
import { BadRequestException, HttpException } from '../../exceptions';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseFloatPipe', () => {
  let target: ParseFloatPipe;
  beforeEach(() => {
    target = new ParseFloatPipe();
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
        const value = await target.transform(undefined, {} as ArgumentMetadata);
        expect(value).to.equal(undefined);
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(
          target.transform('123.123abc', {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
      });
      it('should mention the field name in the error', async () => {
        return expect(
          target.transform('123.123abc', { data: 'foo' } as ArgumentMetadata),
        ).to.be.rejectedWith(/.*Validation failed.*"foo".*/);
      });
    });
    describe('with an exceptionFactory', () => {
      beforeEach(() => {
        target = new ParseFloatPipe({
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
