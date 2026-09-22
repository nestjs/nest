import { OPTIONAL_DEPS_METADATA } from '../../constants.js';
import { BadRequestException } from '../../exceptions/index.js';
import { ParseDatePipe } from '../../pipes/parse-date.pipe.js';

describe('ParseDatePipe', () => {
  let target: ParseDatePipe;

  beforeEach(() => {
    target = new ParseDatePipe();
  });

  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return a valid date object', () => {
        const date = new Date().toISOString();

        const transformedDate = target.transform(date)!;
        expect(transformedDate).toBeInstanceOf(Date);
        expect(transformedDate.toISOString()).toBe(date);

        const asNumber = transformedDate.getTime();
        const transformedNumber = target.transform(asNumber)!;
        expect(transformedNumber).toBeInstanceOf(Date);
        expect(transformedNumber.getTime()).toBe(asNumber);
      });

      it('should parse zero timestamp as a valid date', () => {
        const transformedDate = target.transform(0)!;

        expect(transformedDate).toBeInstanceOf(Date);
        expect(transformedDate.getTime()).toBe(0);
      });

      it('should not throw an error if the value is undefined/null and optional is true', () => {
        const target = new ParseDatePipe({ optional: true });
        const value = target.transform(undefined);
        expect(value).toBe(undefined);
      });
    });
    describe('when default value is provided', () => {
      it('should return the default value if the value is undefined/null', () => {
        const defaultValue = new Date();
        const target = new ParseDatePipe({
          optional: true,
          default: () => defaultValue,
        });
        const value = target.transform(undefined);
        expect(value).toBe(defaultValue);
      });

      it('should return the default value without requiring "optional"', () => {
        const defaultValue = new Date();
        const target = new ParseDatePipe({ default: () => defaultValue });

        expect(target.transform(undefined)).toBe(defaultValue);
        expect(target.transform(null)).toBe(defaultValue);
      });

      it('should throw for an empty string even when a default value is provided', () => {
        const defaultValue = new Date();
        const target = new ParseDatePipe({ default: () => defaultValue });

        expect(() => target.transform('')).toThrow(BadRequestException);
      });

      it('should throw for an empty string when both "optional" and a default value are provided', () => {
        const defaultValue = new Date();
        const target = new ParseDatePipe({
          optional: true,
          default: () => defaultValue,
        });

        expect(() => target.transform('')).toThrow(BadRequestException);
      });

      it('should not fall back to the default value for an invalid value', () => {
        const defaultValue = new Date();
        const target = new ParseDatePipe({ default: () => defaultValue });

        expect(() => target.transform('123abc')).toThrow(BadRequestException);
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', () => {
        expect(() => target.transform('123abc')).toThrow(BadRequestException);
      });
    });
    describe('when empty value', () => {
      it('should throw an error', () => {
        expect(() => target.transform('')).toThrow(BadRequestException);
      });

      it('should throw an error even when "optional" is true', () => {
        const target = new ParseDatePipe({ optional: true });
        expect(() => target.transform('')).toThrow(BadRequestException);
      });
    });
  });

  describe('dependency injection', () => {
    it('should mark the options argument as optional', () => {
      // Without this metadata the injector cannot instantiate the pipe when it
      // is passed by class, e.g. `@Query('date', ParseDatePipe)`.
      const metadata = Reflect.getMetadata(
        OPTIONAL_DEPS_METADATA,
        ParseDatePipe,
      );
      expect(metadata).toEqual([0]);
    });

    it('should fall back to the default options when none are injected', () => {
      const target = new ParseDatePipe(undefined as any);
      expect(() => target.transform('')).toThrow(BadRequestException);
    });
  });
});
