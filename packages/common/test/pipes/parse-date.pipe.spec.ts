import { expect } from 'chai';
import { BadRequestException } from '../../exceptions';
import { ParseDatePipe } from '../../pipes/parse-date.pipe';

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
        expect(transformedDate).to.be.instanceOf(Date);
        expect(transformedDate.toISOString()).to.equal(date);

        const asNumber = transformedDate.getTime();
        const transformedNumber = target.transform(asNumber)!;
        expect(transformedNumber).to.be.instanceOf(Date);
        expect(transformedNumber.getTime()).to.equal(asNumber);
      });

      it('should not throw an error if the value is undefined/null and optional is true', () => {
        const target = new ParseDatePipe({ optional: true });
        const value = target.transform(undefined);
        expect(value).to.equal(undefined);
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
        expect(value).to.equal(defaultValue);
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', () => {
        try {
          target.transform('123abc');
          expect.fail();
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.message).to.equal(
            'Validation failed (invalid date format)',
          );
        }
      });
    });
    describe('when empty value', () => {
      it('should throw an error', () => {
        try {
          target.transform('');
          expect.fail();
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.message).to.equal(
            'Validation failed (no Date provided)',
          );
        }
      });
    });
  });
});
