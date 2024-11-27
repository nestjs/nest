import { expect } from 'chai';
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
        expect(await target.transform('true', {} as ArgumentMetadata)).to.be
          .true;
        expect(await target.transform(true, {} as ArgumentMetadata)).to.be.true;
        expect(await target.transform('false', {} as ArgumentMetadata)).to.be
          .false;
        expect(await target.transform(false, {} as ArgumentMetadata)).to.be
          .false;
      });

      it('should not throw an error if the value is undefined/null and optional is true', async () => {
        const target = new ParseBoolPipe({ optional: true });
        const value = await target.transform(
          undefined!,
          {} as ArgumentMetadata,
        );
        expect(value).to.equal(undefined);
      });
    });
    describe('when validation fails', () => {
      it('should throw an error', async () => {
        return expect(target.transform('123abc', {} as ArgumentMetadata)).to.be
          .rejected;
      });
    });
  });
});
