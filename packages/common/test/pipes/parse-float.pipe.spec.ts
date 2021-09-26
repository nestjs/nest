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
    });
    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(
          target.transform('123.123abc', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });
  });
});
