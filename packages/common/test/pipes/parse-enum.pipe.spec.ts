import { HttpException } from '../../exceptions/index.js';
import { ArgumentMetadata } from '../../interfaces/index.js';
import { ParseEnumPipe } from '../../pipes/parse-enum.pipe.js';

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
        expect(await target.transform('UP', {} as ArgumentMetadata)).toBe(
          Direction.Up,
        );
      });

      it('should not throw an error if enumType is undefined/null and optional is true', async () => {
        const target = new ParseEnumPipe('DOWN', { optional: true });
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
          target.transform('DOWN', {} as ArgumentMetadata),
        ).rejects.toThrow(CustomTestError);
      });

      it('should throw an error if enumType is wrong and optional is true', async () => {
        target = new ParseEnumPipe(Direction, {
          exceptionFactory: (error: any) => new CustomTestError(),
          optional: true,
        });
        return expect(
          target.transform('DOWN', {} as ArgumentMetadata),
        ).rejects.toThrow(CustomTestError);
      });
    });
  });
  describe('constructor', () => {
    it('should throw an error if "enumType" is undefined/null', () => {
      try {
        new ParseEnumPipe(null);
      } catch (err) {
        expect(err.message).toBe(
          `"ParseEnumPipe" requires "enumType" argument specified (to validate input values).`,
        );
      }
    });
  });

  describe('when enum is numeric', () => {
    enum Status {
      Active = 0,
      Inactive = 1,
    }
    let numericTarget: ParseEnumPipe;

    beforeEach(() => {
      numericTarget = new ParseEnumPipe(Status);
    });

    it('should return numeric enum value when the numeric value is passed', async () => {
      expect(
        await numericTarget.transform(
          Status.Active as any,
          {} as ArgumentMetadata,
        ),
      ).toBe(Status.Active);
      expect(
        await numericTarget.transform(
          Status.Inactive as any,
          {} as ArgumentMetadata,
        ),
      ).toBe(Status.Inactive);
    });

    it('should return numeric enum value when the numeric value is passed as a string', async () => {
      expect(
        await numericTarget.transform('0' as any, {} as ArgumentMetadata),
      ).toBe(Status.Active);
      expect(
        await numericTarget.transform('1' as any, {} as ArgumentMetadata),
      ).toBe(Status.Inactive);
    });

    it('should throw when an invalid numeric string is passed', async () => {
      await expect(
        numericTarget.transform('2' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(HttpException);
    });

    it('should throw when an empty or whitespace string is passed', async () => {
      await expect(
        numericTarget.transform('' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(HttpException);
      await expect(
        numericTarget.transform('   ' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(HttpException);
    });

    it('should throw when a reverse-mapped key name is passed instead of the value', async () => {
      try {
        await numericTarget.transform('Active' as any, {} as ArgumentMetadata);
        expect.fail('expected transform to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
      }
    });
  });

  describe('when enum is numeric with negative values', () => {
    enum Temperature {
      Freezing = -5,
      Zero = 0,
      Boiling = 100,
    }
    let target: ParseEnumPipe;

    beforeEach(() => {
      target = new ParseEnumPipe(Temperature);
    });

    it('should parse negative numeric string and return number', async () => {
      expect(await target.transform('-5' as any, {} as ArgumentMetadata)).toBe(
        Temperature.Freezing,
      );
      expect(await target.transform('0' as any, {} as ArgumentMetadata)).toBe(
        Temperature.Zero,
      );
      expect(await target.transform('100' as any, {} as ArgumentMetadata)).toBe(
        Temperature.Boiling,
      );
    });
  });

  describe('when enum has string values with digit characters', () => {
    enum DigitString {
      Zero = '0',
      One = '1',
    }
    let target: ParseEnumPipe;

    beforeEach(() => {
      target = new ParseEnumPipe(DigitString);
    });

    it('should preserve string type and not coerce to number', async () => {
      const result = await target.transform('0', {} as ArgumentMetadata);
      expect(result).toBe('0');
      expect(typeof result).toBe('string');
    });
  });
});
