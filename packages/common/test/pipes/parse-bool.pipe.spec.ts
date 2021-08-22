import { ArgumentMetadata } from '../../interfaces';
import { ParseBoolPipe } from '../../pipes/parse-bool.pipe';

describe('ParseBoolPipe', () => {
  let target: ParseBoolPipe;
  beforeEach(() => {
    target = new ParseBoolPipe();
  });
  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return boolean', async () => {
        expect(
          await target.transform('true', {} as ArgumentMetadata),
        ).toBeTruthy();
        expect(
          await target.transform(true, {} as ArgumentMetadata),
        ).toBeTruthy();
        expect(
          await target.transform('false', {} as ArgumentMetadata),
        ).toBeFalsy();
        expect(
          await target.transform(false, {} as ArgumentMetadata),
        ).toBeFalsy();
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(
          target.transform('123abc', {} as ArgumentMetadata),
        ).rejects.toThrow();
      });
    });
  });
});
