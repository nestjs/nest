import { expect } from 'chai';
import { HttpException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ParseEnumPipe } from '../../pipes/parse-enum.pipe';

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

      it('should not throw an error if enumType is undefined/null and optional is true', async () => {
        const target = new ParseEnumPipe('DOWN', { optional: true });
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
          target.transform('DOWN', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });

      it('should throw an error if enumType is wrong and optional is true', async () => {
        target = new ParseEnumPipe(Direction, {
          exceptionFactory: (error: any) => new CustomTestError(),
          optional: true,
        });
        return expect(
          target.transform('DOWN', {} as ArgumentMetadata),
        ).to.be.rejectedWith(CustomTestError);
      });
    });
  });
  describe('constructor', () => {
    it('should throw an error if "enumType" is undefined/null', () => {
      try {
        new ParseEnumPipe(null);
      } catch (err) {
        expect(err.message).to.equal(
          `"ParseEnumPipe" requires "enumType" argument specified (to validate input values).`,
        );
      }
    });
  });
});
