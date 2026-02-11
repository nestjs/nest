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
    });
    describe('when validation fails', () => {
      it('should throw an error', () => {
        try {
          target.transform('123abc');
          expect.fail();
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toBe('Validation failed (invalid date format)');
        }
      });
    });
    describe('when empty value', () => {
      it('should throw an error', () => {
        try {
          target.transform('');
          expect.fail();
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toBe('Validation failed (no Date provided)');
        }
      });
    });
  });
});
