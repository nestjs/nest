import { HttpStatus } from '../../enums/index.js';
import { HttpException } from '../../exceptions/index.js';
import { ArgumentMetadata } from '../../interfaces/index.js';
import { ParseUUIDPipe } from '../../pipes/parse-uuid.pipe.js';

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
        expect(await target.transform(v3, {} as ArgumentMetadata)).toBe(v3);
        expect(await target.transform(v4, {} as ArgumentMetadata)).toBe(v4);
        expect(await target.transform(v5, {} as ArgumentMetadata)).toBe(v5);
      });

      it('should return string if value is uuid v1, v6, v7, v8, nil or max', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        for (const uuid of [
          'c232ab00-9414-11ec-b3c8-9f6bdeced846',
          '1ec9414c-232a-6b00-b3c8-9f6bdeced846',
          '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
          '2489e9ad-2ee2-8e00-8ec9-32d5f69181c0',
          '00000000-0000-0000-0000-000000000000',
          'ffffffff-ffff-ffff-ffff-ffffffffffff',
          'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
        ]) {
          expect(await target.transform(uuid, {} as ArgumentMetadata)).toBe(
            uuid,
          );
        }
      });

      it('should return string if value is uuid v3', async () => {
        target = new ParseUUIDPipe({ version: '3', exceptionFactory });
        expect(await target.transform(v3, {} as ArgumentMetadata)).toBe(v3);
      });

      it('should return string if value is uuid v4', async () => {
        target = new ParseUUIDPipe({ version: '4', exceptionFactory });
        expect(await target.transform(v4, {} as ArgumentMetadata)).toBe(v4);
      });

      it('should return string if value is uuid v5', async () => {
        target = new ParseUUIDPipe({ version: '5', exceptionFactory });
        expect(await target.transform(v5, {} as ArgumentMetadata)).toBe(v5);
      });
      it('should not throw an error if the value is undefined/null and optional is true', async () => {
        const target = new ParseUUIDPipe({ optional: true });
        const value = await target.transform(
          undefined!,
          {} as ArgumentMetadata,
        );
        expect(value).toBe(undefined);
      });
    });

    describe('when validation fails', () => {
      it('should throw an error', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
      });

      it('should throw an error - not a string', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        await expect(
          target.transform(undefined!, {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
      });

      it('should throw an error for a UUID with an invalid version', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        for (const invalid of [
          // same as `v4` but with version nibble `0` or `f` instead of `4`
          '10ba038e-48da-087b-96e8-8d3b99b6d18a',
          '10ba038e-48da-f87b-96e8-8d3b99b6d18a',
        ]) {
          await expect(
            target.transform(invalid, {} as ArgumentMetadata),
          ).rejects.toThrow(TestException);
        }
      });

      it('should throw an error for a UUID with an invalid variant', async () => {
        target = new ParseUUIDPipe({ exceptionFactory });
        for (const invalid of [
          // same as `v4` but with variant nibble `0` or `c` instead of `9`
          '10ba038e-48da-487b-06e8-8d3b99b6d18a',
          '10ba038e-48da-487b-c6e8-8d3b99b6d18a',
        ]) {
          await expect(
            target.transform(invalid, {} as ArgumentMetadata),
          ).rejects.toThrow(TestException);
        }
      });

      it('should throw an error - v3', async () => {
        target = new ParseUUIDPipe({ version: '3', exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
        await expect(
          target.transform(v4, {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
        await expect(
          target.transform(v5, {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
      });

      it('should throw an error for a UUID v3 with an invalid variant', async () => {
        target = new ParseUUIDPipe({ version: '3', exceptionFactory });
        await expect(
          target.transform(
            // same as `v3` but with variant nibble `0` instead of `a`
            'e8b5a51d-11c8-3310-06ab-367563f20686',
            {} as ArgumentMetadata,
          ),
        ).rejects.toThrow(TestException);
      });

      it('should throw an error - v4', async () => {
        target = new ParseUUIDPipe({ version: '4', exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
        await expect(
          target.transform(v3, {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
        await expect(
          target.transform(v5, {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
      });

      it('should throw an error - v5 ', async () => {
        target = new ParseUUIDPipe({ version: '5', exceptionFactory });
        await expect(
          target.transform('123a', {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
        await expect(
          target.transform(v3, {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
        await expect(
          target.transform(v4, {} as ArgumentMetadata),
        ).rejects.toThrow(TestException);
      });
    });
  });
});
