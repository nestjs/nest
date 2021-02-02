import * as sinon from 'sinon';
import { expect } from 'chai';
import { ArgumentMetadata } from '../../interfaces';
import { ParseEnumPipe } from '../../pipes/parse-enum.pipe';
import { HttpException } from '../../exceptions';

class CustomTestError extends HttpException {
  constructor() {
    super('This is a TestException', 418);
  }
}

describe('ParseEnumPipe', () => {
  enum Direction {
    Up = 'UP',
  }
  let target: ParseEnumPipe;
  beforeEach(() => {
    target = new ParseEnumPipe(Direction, {
      exceptionFactory: (error: any) => new CustomTestError(),
    });
  });
  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return enum value', async () => {
        expect(await target.transform('UP', {} as ArgumentMetadata)).to.equal(
          Direction.Up,
        );
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(
          target.transform('DOWN', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });
  });
});
