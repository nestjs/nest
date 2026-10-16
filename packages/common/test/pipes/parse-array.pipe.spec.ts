import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BadRequestException } from '../../exceptions/index.js';
import { ArgumentMetadata } from '../../interfaces/features/pipe-transform.interface.js';
import { ParseArrayPipe } from '../../pipes/parse-array.pipe.js';

describe('ParseArrayPipe', () => {
  let target: ParseArrayPipe;

  describe('transform', () => {
    describe('when undefined value', () => {
      describe('and optional disabled', () => {
        it('should throw an exception', async () => {
          target = new ParseArrayPipe({ optional: false });

          return expect(
            target.transform(undefined, {} as ArgumentMetadata),
          ).rejects.toThrow(BadRequestException);
        });
      });
      describe('and optional enabled', () => {
        it('should return undefined', async () => {
          target = new ParseArrayPipe({ optional: true });

          expect(
            await target.transform(undefined, {} as ArgumentMetadata),
          ).toBeUndefined();
        });
      });
    });

    describe('when empty string', () => {
      describe('and optional disabled', () => {
        it('should parse to a single empty item', async () => {
          target = new ParseArrayPipe({ optional: false });

          expect(await target.transform('', {} as ArgumentMetadata)).toEqual([
            '',
          ]);
        });
      });
      describe('and optional enabled', () => {
        it('should parse to a single empty item', async () => {
          target = new ParseArrayPipe({ optional: true });

          expect(await target.transform('', {} as ArgumentMetadata)).toEqual([
            '',
          ]);
        });
      });
    });

    describe('when value is not parseable', () => {
      beforeEach(() => {
        target = new ParseArrayPipe();
      });
      it('should throw an exception (boolean)', async () => {
        return expect(
          target.transform(true, {} as ArgumentMetadata),
        ).rejects.toThrow(BadRequestException);
      });
      it('should throw an exception (number)', async () => {
        return expect(
          target.transform(3, {} as ArgumentMetadata),
        ).rejects.toThrow(BadRequestException);
      });
      it('should throw an exception (object)', async () => {
        return expect(
          target.transform({}, {} as ArgumentMetadata),
        ).rejects.toThrow(BadRequestException);
      });

      describe('and "optional" is enabled', () => {
        it('should throw an exception', async () => {
          const pipe = new ParseArrayPipe({
            optional: true,
            items: String,
            separator: ',',
          });
          return expect(
            pipe.transform({}, {} as ArgumentMetadata),
          ).rejects.toThrow(BadRequestException);
        });
      });
    });

    describe('when value is parseable (string)', () => {
      it('should parse an array based on the separator', async () => {
        target = new ParseArrayPipe();

        expect(
          await target.transform(
            '1,2.0,3,{},true,null,,',
            {} as ArgumentMetadata,
          ),
        ).toEqual(['1', '2.0', '3', '{}', 'true', 'null', '', '']);

        target = new ParseArrayPipe({ separator: '/' });

        expect(await target.transform('1/2/3', {} as ArgumentMetadata)).toEqual(
          ['1', '2', '3'],
        );

        target = new ParseArrayPipe({ separator: '.' });

        expect(await target.transform('1.2.3', {} as ArgumentMetadata)).toEqual(
          ['1', '2', '3'],
        );
      });

      describe('and type is specified', () => {
        it('should parse & validate the array', async () => {
          target = new ParseArrayPipe({ separator: '.', items: Number });

          expect(
            await target.transform('1.2.3', {} as ArgumentMetadata),
          ).toEqual([1, 2, 3]);

          target = new ParseArrayPipe({ separator: '.', items: Number });

          try {
            await target.transform('1.2.a.null.3', {} as ArgumentMetadata);
            throw null;
          } catch (err) {
            expect(err).toBeInstanceOf(BadRequestException);
            expect(err.getResponse().message).toEqual(
              '[2] item must be a number',
            );
          }

          target = new ParseArrayPipe({ separator: '.', items: Boolean });

          try {
            await target.transform('1.2.a.null.3', {} as ArgumentMetadata);
            throw null;
          } catch (err) {
            expect(err).toBeInstanceOf(BadRequestException);
            expect(err.getResponse().message).toEqual(
              '[0] item must be a boolean value',
            );
          }

          target = new ParseArrayPipe({
            separator: '.',
            items: Number,
            stopAtFirstError: false,
          });

          try {
            await target.transform('1.2.a.b.null.3', {} as ArgumentMetadata);
            throw null;
          } catch (err) {
            expect(err).toBeInstanceOf(BadRequestException);
            expect(err.getResponse().message).toEqual([
              '[2] item must be a number',
              '[3] item must be a number',
              '[4] item must be a number',
            ]);
          }
        });
      });
    });

    describe('when items type is determined', () => {
      class ArrItem {}

      it('should validate and transform each item', async () => {
        target = new ParseArrayPipe({
          items: ArrItem,
          forbidUnknownValues: false,
        });

        let items = await target.transform(
          [{}, {}, {}],
          {} as ArgumentMetadata,
        );
        items.forEach(item => {
          expect(item).toBeInstanceOf(ArrItem);
        });

        items = await target.transform('{},{},{}', {} as ArgumentMetadata);
        items.forEach(item => {
          expect(item).toBeInstanceOf(ArrItem);
        });

        target = new ParseArrayPipe({ items: Number });
        expect(
          await target.transform('1,2.0,3', {} as ArgumentMetadata),
        ).toEqual([1, 2, 3]);

        target = new ParseArrayPipe({ items: String });
        expect(
          await target.transform(
            '1,2.0,3,{},true,null,,',
            {} as ArgumentMetadata,
          ),
        ).toEqual(['1', '2.0', '3', '{}', 'true', 'null', '', '']);

        target = new ParseArrayPipe({ items: Boolean });
        expect(
          await target.transform('true,false', {} as ArgumentMetadata),
        ).toEqual([true, false]);
      });
      it('should reject items that are not numbers when items is Number', async () => {
        target = new ParseArrayPipe({ items: Number });

        for (const [value, index] of [
          ['1,true', 1],
          ['1,false', 1],
          ['1,[2]', 1],
          ['1, ,2', 1],
          ['1,Infinity', 1],
          ['1,-Infinity', 1],
          ['1,0x10', 1],
          ['1,0b11', 1],
          ['1,0o17', 1],
        ] as const) {
          await expect(
            target.transform(value, {} as ArgumentMetadata),
          ).rejects.toThrow(`[${index}] item must be a number`);
        }

        await expect(
          target.transform([1, true], {} as ArgumentMetadata),
        ).rejects.toThrow('[1] item must be a number');
      });
      it('should keep parsing numeric strings when items is Number', async () => {
        target = new ParseArrayPipe({ items: Number });

        expect(
          await target.transform(
            '1, 2,-3.5,1e3,01,+4,.5',
            {} as ArgumentMetadata,
          ),
        ).toEqual([1, 2, -3.5, 1000, 1, 4, 0.5]);
      });
      it('should reject an array nested in the array when items is Number', async () => {
        target = new ParseArrayPipe({ items: Number });

        for (const [value, index] of [
          [[[1]], 0],
          [[['2']], 0],
          [[[[3]]], 0],
          [[1, [2]], 1],
        ] as const) {
          await expect(
            target.transform(value, {} as ArgumentMetadata),
          ).rejects.toThrow(`[${index}] item must be a number`);
        }
      });
      it('should reject an array nested in the array when items is Boolean', async () => {
        target = new ParseArrayPipe({ items: Boolean });

        for (const [value, index] of [
          [[[true]], 0],
          [[['false']], 0],
          [[true, [false]], 1],
        ] as const) {
          await expect(
            target.transform(value, {} as ArgumentMetadata),
          ).rejects.toThrow(`[${index}] item must be a boolean value`);
        }
      });
      it('should not parse a JSON string nested in the array when items is a class', async () => {
        class ArrItemWithProp {
          @IsNumber()
          number: number;
        }
        target = new ParseArrayPipe({ items: ArrItemWithProp });

        await expect(
          target.transform([['{"number":1}']], {} as ArgumentMetadata),
        ).rejects.toThrow(BadRequestException);
      });
      it('should reject items that are not objects when items is a class', async () => {
        class ArrItemAllOptional {
          @IsOptional()
          @IsNumber()
          number: number;
        }
        target = new ParseArrayPipe({ items: ArrItemAllOptional });

        for (const value of [[[{ number: 1 }]], [7], ['x'], '[{"number":1}]']) {
          await expect(
            target.transform(value, {} as ArgumentMetadata),
          ).rejects.toMatchObject({
            response: { message: ['Validation failed (object is expected)'] },
          });
        }
        const items = await target.transform(
          '{},{"number":1}',
          {} as ArgumentMetadata,
        );
        expect(items).toEqual([{}, { number: 1 }]);
        items.forEach(item => expect(item).toBeInstanceOf(ArrItemAllOptional));
      });
      it('should keep parsing the items of an array', async () => {
        target = new ParseArrayPipe({ items: Number });
        expect(
          await target.transform([1, '2', '3.5'], {} as ArgumentMetadata),
        ).toEqual([1, 2, 3.5]);

        target = new ParseArrayPipe({ items: Boolean });
        expect(
          await target.transform([true, 'false'], {} as ArgumentMetadata),
        ).toEqual([true, false]);
      });
      it('should stop validating at the first invalid item', async () => {
        class ArrItemWithProp {
          @IsDefined()
          number: number;
        }
        target = new ParseArrayPipe({ items: ArrItemWithProp });
        const transform = vi.spyOn(target['validationPipe'], 'transform');

        await expect(
          target.transform([{ number: 1 }, {}, {}, {}], {} as ArgumentMetadata),
        ).rejects.toThrow(BadRequestException);
        expect(transform).toHaveBeenCalledTimes(2);
      });
      it('should validate one item after the other', async () => {
        class ArrItem {}
        target = new ParseArrayPipe({
          items: ArrItem,
          forbidUnknownValues: false,
        });
        const transform = target['validationPipe'].transform;
        let pending = 0;
        let maxPending = 0;
        vi.spyOn(target['validationPipe'], 'transform').mockImplementation(
          async (...args) => {
            maxPending = Math.max(maxPending, ++pending);
            try {
              return await transform.apply(target['validationPipe'], args);
            } finally {
              pending--;
            }
          },
        );

        const items = await target.transform(
          [{}, {}, {}],
          {} as ArgumentMetadata,
        );
        expect(items).toHaveLength(3);
        items.forEach(item => expect(item).toBeInstanceOf(ArrItem));
        expect(maxPending).toBe(1);
      });
      it('should leave the input array unchanged', async () => {
        const input = ['1', '2'];
        target = new ParseArrayPipe({ items: Number });

        expect(await target.transform(input, {} as ArgumentMetadata)).toEqual([
          1, 2,
        ]);
        expect(input).toEqual(['1', '2']);
      });
      it('should not validate the holes of a sparse array', async () => {
        const input = ['1', '2', '3'];
        delete input[1];
        target = new ParseArrayPipe({ items: Number });

        expect(await target.transform(input, {} as ArgumentMetadata)).toEqual([
          1,
          undefined,
          3,
        ]);
      });
      describe('when "stopAtFirstError" is explicitly turned off', () => {
        it('should leave the input array unchanged after successful transformation', async () => {
          const input = ['1', '2'];
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
          });

          const transformed = await pipe.transform(
            input,
            {} as ArgumentMetadata,
          );

          expect(transformed).toEqual([1, 2]);
          expect(input).toEqual(['1', '2']);
        });

        it('should leave the input array unchanged when validation fails', async () => {
          const input = ['1', 'invalid', '3'];
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
          });

          const error = await pipe
            .transform(input, {} as ArgumentMetadata)
            .catch(err => err);

          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.getResponse().message).toEqual([
            '[1] item must be a number',
          ]);
          expect(input).toEqual(['1', 'invalid', '3']);
        });

        it('should validate each item and concat errors', async () => {
          class ArrItemWithProp {
            @IsNumber()
            number: number;
          }
          const pipe = new ParseArrayPipe({
            items: ArrItemWithProp,
            stopAtFirstError: false,
          });
          try {
            await pipe.transform(
              [
                { number: '1' },
                { number: '1' },
                { number: 1 },
              ] as ArrItemWithProp[],
              {} as ArgumentMetadata,
            );
          } catch (err) {
            expect(err).toBeInstanceOf(BadRequestException);
            expect(err.getResponse().message).toEqual([
              '[0] number must be a number conforming to the specified constraints',
              '[1] number must be a number conforming to the specified constraints',
            ]);
          }
        });

        it('should collect the errors without copying them for each item', async () => {
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
          });
          // Concatenating each item's error to the list copies every error
          // collected before it, 4,950 copies for 100 invalid items.
          const concat = vi.spyOn(Array.prototype, 'concat');
          let error: any;
          let copied: number;
          try {
            error = await pipe
              .transform(','.repeat(99), {} as ArgumentMetadata)
              .catch(err => err);
            copied = concat.mock.contexts.reduce(
              (total: number, array: unknown[]) => total + array.length,
              0,
            );
          } finally {
            concat.mockRestore();
          }

          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.getResponse().message).toHaveLength(100);
          expect(copied).toBeLessThan(100);
        });

        it('should report every array nested in the array', async () => {
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
          });

          const error = await pipe
            .transform([[1], 2, ['3']], {} as ArgumentMetadata)
            .catch(err => err);

          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.getResponse().message).toEqual([
            '[0] item must be a number',
            '[2] item must be a number',
          ]);
        });

        it('should validate each nested object and concat errors', async () => {
          class RandomObject {
            @IsDefined()
            @IsBoolean()
            isEnabled: boolean;

            @IsString()
            title: string;

            @IsDate()
            createdAt: Date;

            constructor(partial: Partial<any>) {
              Object.assign(this, partial);
            }
          }
          class ArrItemObject {
            @ValidateNested()
            random: RandomObject;
          }
          const pipe = new ParseArrayPipe({
            items: ArrItemObject,
            stopAtFirstError: false,
          });
          try {
            await pipe.transform(
              [
                {
                  random: new RandomObject({
                    isEnabled: true,
                    title: true,
                    createdAt: new Date(),
                  }),
                },
                {
                  random: new RandomObject({
                    title: 'ok',
                    createdAt: false,
                  }),
                },
              ] as any[],
              {} as ArgumentMetadata,
            );
          } catch (err) {
            expect(err).toBeInstanceOf(BadRequestException);
            expect(err.getResponse().message).toEqual([
              '[0] random.title must be a string',
              '[1] random.isEnabled should not be null or undefined',
              '[1] random.isEnabled must be a boolean value',
              '[1] random.createdAt must be a Date instance',
            ]);
          }
        });

        it('should validate each nested array and concat errors', async () => {
          class RandomObject {
            @IsDefined()
            @IsBoolean()
            isEnabled: boolean;

            @IsString()
            title: string;

            @IsDate()
            createdAt: Date;

            constructor(partial: Partial<any>) {
              Object.assign(this, partial);
            }
          }
          class ArrItemObject {
            @Type(() => RandomObject)
            @ValidateNested({ each: true })
            random: RandomObject[];
          }
          const pipe = new ParseArrayPipe({
            items: ArrItemObject,
            stopAtFirstError: false,
          });
          try {
            await pipe.transform(
              [
                {
                  random: [
                    new RandomObject({
                      isEnabled: true,
                      title: true,
                      createdAt: new Date(),
                    }),
                    new RandomObject({
                      isEnabled: true,
                      title: true,
                      createdAt: new Date(),
                    }),
                  ],
                },
                {
                  random: [
                    new RandomObject({
                      title: 'ok',
                      createdAt: false,
                    }),
                  ],
                },
              ] as any[],
              {} as ArgumentMetadata,
            );
          } catch (err) {
            expect(err).toBeInstanceOf(BadRequestException);
            expect(err.getResponse().message).toEqual([
              '[0] random.0.title must be a string',
              '[0] random.1.title must be a string',
              '[1] random.0.isEnabled should not be null or undefined',
              '[1] random.0.isEnabled must be a boolean value',
              '[1] random.0.createdAt must be a Date instance',
            ]);
          }
        });
      });
    });
  });
});
