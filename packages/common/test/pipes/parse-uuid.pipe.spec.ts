import { expect } from 'chai';
import { HttpStatus } from '../../enums';
import { HttpException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ParseUUIDPipe } from '../../pipes/parse-uuid.pipe';

class TestException extends HttpException {
  constructor() {
    super('This is a TestException', HttpStatus.I_AM_A_TEAPOT);
  }
}

describe('ParseUUIDPipe', () => {
  let target: ParseUUIDPipe;
  const exceptionFactory = (error: any) => new TestException();

  describe('transform', () => {
    const v3 = 'e8b5a51d-11c8-3310-a6ab-367563f20686';
    const v4 = '10ba038e-48da-487b-96e8-8d3b99b6d18a';
    const v5 = '630eb68f-e0fa-5ecc-887a-7c7a62614681';

    describe('when validation passes', () => {
      it('should return string if value is uuid v3, v4 or v5', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        expect(await target.transform(v3, {} as ArgumentMetadata)).to.equal(v3);
        expect(await target.transform(v4, {} as ArgumentMetadata)).to.equal(v4);
        expect(await target.transform(v5, {} as ArgumentMetadata)).to.equal(v5);
      });

      it('should return string if value is uuid v3', async () => {
        target = new ParseUUIDPipe({ version: '3', exceptionFactory });
        expect(await target.transform(v3, {} as ArgumentMetadata)).to.equal(v3);
      });

      it('should return string if value is uuid v4', async () => {
        target = new ParseUUIDPipe({ version: '4', exceptionFactory });
        expect(await target.transform(v4, {} as ArgumentMetadata)).to.equal(v4);
      });

      it('should return string if value is uuid v5', async () => {
        target = new ParseUUIDPipe({ version: '5', exceptionFactory });
        expect(await target.transform(v5, {} as ArgumentMetadata)).to.equal(v5);
      });
    });

    describe('when validation fails', () => {
      it('should throw an error', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
      });

      it('should throw an error - not a string', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        await expect(
          target.transform(undefined, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
      });

      it('should throw an error - v3', async () => {
        target = new ParseUUIDPipe({ version: '3', exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
        await expect(
          target.transform(v4, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
        await expect(
          target.transform(v5, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
      });

      it('should throw an error - v4', async () => {
        target = new ParseUUIDPipe({ version: '4', exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
        await expect(
          target.transform(v3, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
        await expect(
          target.transform(v5, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
      });

      it('should throw an error - v5 ', async () => {
        target = new ParseUUIDPipe({ version: '5', exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
        await expect(
          target.transform(v3, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
        await expect(
          target.transform(v4, {} as ArgumentMetadata),
        ).to.be.rejectedWith(TestException);
      });
    });
  });
});
