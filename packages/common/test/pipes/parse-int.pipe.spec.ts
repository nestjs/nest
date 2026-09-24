import { HttpException } from '../../exceptions/index.js';
import { ArgumentMetadata } from '../../interfaces/index.js';
import { ParseIntPipe } from '../../pipes/parse-int.pipe.js';

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
        expect(await target.transform(num, {} as ArgumentMetadata)).toBe(
          parseInt(num, 10),
        );
      });
      it('should return negative number', async () => {
        const num = '-3';
        expect(await target.transform(num, {} as ArgumentMetadata)).toBe(-3);
      });
      it('should return the largest safe integer', async () => {
        const num = String(Number.MAX_SAFE_INTEGER);
        expect(await target.transform(num, {} as ArgumentMetadata)).toBe(
          Number.MAX_SAFE_INTEGER,
        );
      });
      it('should return the smallest safe integer', async () => {
        const num = String(Number.MIN_SAFE_INTEGER);
        expect(await target.transform(num, {} as ArgumentMetadata)).toBe(
          Number.MIN_SAFE_INTEGER,
        );
      });
      it('should not throw an error if the value is undefined/null and optional is true', async () => {
        const target = new ParseIntPipe({ optional: true });
        const value = await target.transform(
          undefined!,
          {} as ArgumentMetadata,
        );
        expect(value).toBe(undefined);
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(
          target.transform('123abc', {} as ArgumentMetadata),
        ).rejects.toThrow(CustomTestError);
      });
      it('should throw an error when number has wrong number encoding', async () => {
        return expect(
          target.transform('0xFF', {} as ArgumentMetadata),
        ).rejects.toThrow(CustomTestError);
      });
      it('should throw an error when the number exceeds the safe integer range', async () => {
        return expect(
          target.transform(
            String(Number.MAX_SAFE_INTEGER + 1),
            {} as ArgumentMetadata,
          ),
        ).rejects.toThrow(CustomTestError);
      });
      it('should throw an error when the number is below the safe integer range', async () => {
        return expect(
          target.transform(
            String(Number.MIN_SAFE_INTEGER - 1),
            {} as ArgumentMetadata,
          ),
        ).rejects.toThrow(CustomTestError);
      });
      it('should throw an error when the number would be rounded when parsed', async () => {
        return expect(
          target.transform('9007199254740993', {} as ArgumentMetadata),
        ).rejects.toThrow(CustomTestError);
      });
      it('should throw an error when a number value is not a safe integer', async () => {
        return expect(
          target.transform(2 ** 60, {} as ArgumentMetadata),
        ).rejects.toThrow(CustomTestError);
      });
    });
  });
});
