import { BadRequestException, HttpException } from '../../exceptions/index.js';
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
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when an empty or whitespace string is passed', async () => {
      await expect(
        numericTarget.transform('' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
      await expect(
        numericTarget.transform('   ' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when a looser numeric representation is passed', async () => {
      const invalidValues = ['01', '00', '1.0', '0.0', '-0', '+1', ' 1', '1e0'];
      for (const val of invalidValues) {
        await expect(
          numericTarget.transform(val as any, {} as ArgumentMetadata),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should throw when a reverse-mapped key name is passed instead of the value', async () => {
      try {
        await numericTarget.transform('Active' as any, {} as ArgumentMetadata);
        expect.fail('expected transform to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe('Validation failed (enum string is expected)');
      }
    });
  });

  describe('memoization', () => {
    enum Status {
      Active = 0,
      Inactive = 1,
    }

    it('should compute the enum values only once across transforms', async () => {
      const target = new ParseEnumPipe(Status);
      const computeSpy = vi.spyOn(target as any, 'computeEnumValues');

      await target.transform('0' as any, {} as ArgumentMetadata);
      await target.transform('1' as any, {} as ArgumentMetadata);
      await target.transform(Status.Active, {} as ArgumentMetadata);

      expect(computeSpy).toHaveBeenCalledOnce();
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

  describe('when enum has float values', () => {
    enum Ratio {
      Half = 0.5,
      OneAndHalf = 1.5,
    }
    let target: ParseEnumPipe;

    beforeEach(() => {
      target = new ParseEnumPipe(Ratio);
    });

    it('should parse float numeric string and return number', async () => {
      expect(await target.transform('0.5' as any, {} as ArgumentMetadata)).toBe(
        Ratio.Half,
      );
      expect(await target.transform('1.5' as any, {} as ArgumentMetadata)).toBe(
        Ratio.OneAndHalf,
      );
    });

    it('should throw for looser float representations', async () => {
      await expect(
        target.transform('0.50' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('when enum has mixed string and numeric values', () => {
    enum Mixed {
      A = 'a',
      One = 1,
      Alias = 'One',
      Two = 2,
    }
    let target: ParseEnumPipe;

    beforeEach(() => {
      target = new ParseEnumPipe(Mixed);
    });

    it('should parse both string member and numeric member passed as string or number', async () => {
      expect(await target.transform('a', {} as ArgumentMetadata)).toBe(Mixed.A);
      expect(await target.transform('1', {} as ArgumentMetadata)).toBe(
        Mixed.One,
      );
      expect(await target.transform(1, {} as ArgumentMetadata)).toBe(Mixed.One);
    });

    it('should accept a string value that is also a numeric member name', async () => {
      expect(await target.transform('One', {} as ArgumentMetadata)).toBe(
        Mixed.Alias,
      );
    });

    it('should still reject a reverse-mapped name that is not a declared value', async () => {
      await expect(
        target.transform('Two' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when invalid value is passed', async () => {
      await expect(
        target.transform('b' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
      await expect(
        target.transform('01' as any, {} as ArgumentMetadata),
      ).rejects.toThrow(BadRequestException);
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
