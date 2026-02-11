import { ArgumentMetadata } from '../../interfaces/index.js';
import { ParseBoolPipe } from '../../pipes/parse-bool.pipe.js';

describe('ParseBoolPipe', () => {
  let target: ParseBoolPipe;
  beforeEach(() => {
    target = new ParseBoolPipe();
  });
  describe('transform', () => {
    describe('when validation passes', () => {
      it('should return boolean', async () => {
        expect(await target.transform('true', {} as ArgumentMetadata)).toBe(
          true,
        );
        expect(await target.transform(true, {} as ArgumentMetadata)).toBe(true);
        expect(await target.transform('false', {} as ArgumentMetadata)).toBe(
          false,
        );
        expect(await target.transform(false, {} as ArgumentMetadata)).toBe(
          false,
        );
      });

      it('should not throw an error if the value is undefined/null and optional is true', async () => {
        const target = new ParseBoolPipe({ optional: true });
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
        ).rejects.toBeDefined();
      });
    });
  });
});
