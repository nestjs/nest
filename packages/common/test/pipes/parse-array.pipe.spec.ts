import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { BadRequestException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces/features/pipe-transform.interface';
import { ParseArrayPipe } from '../../pipes/parse-array.pipe';
chai.use(chaiAsPromised);

describe('ParseArrayPipe', () => {
  let target: ParseArrayPipe;

  describe('transform', () => {
    describe('when undefined value', () => {
      describe('and optional disabled', () => {
        it('should throw an exception', async () => {
          target = new ParseArrayPipe({ optional: false });

          return expect(
            target.transform(undefined, {} as ArgumentMetadata),
          ).to.to.be.rejectedWith(BadRequestException);
        });
      });
      describe('and optional enabled', () => {
        it('should return undefined', async () => {
          target = new ParseArrayPipe({ optional: true });

          expect(await target.transform(undefined, {} as ArgumentMetadata)).to
            .be.undefined;
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
        ).to.be.rejectedWith(BadRequestException);
      });
      it('should throw an exception (number)', async () => {
        return expect(
          target.transform(3, {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
      });
      it('should throw an exception (object)', async () => {
        return expect(
          target.transform({}, {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
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
          ).to.be.rejectedWith(BadRequestException);
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
        ).to.be.deep.equal(['1', '2.0', '3', '{}', 'true', 'null', '', '']);

        target = new ParseArrayPipe({ separator: '/' });

        expect(
          await target.transform('1/2/3', {} as ArgumentMetadata),
        ).to.be.deep.equal(['1', '2', '3']);

        target = new ParseArrayPipe({ separator: '.' });

        expect(
          await target.transform('1.2.3', {} as ArgumentMetadata),
        ).to.be.deep.equal(['1', '2', '3']);
      });

      describe('and type is specified', () => {
        it('should parse & validate the array', async () => {
          target = new ParseArrayPipe({ separator: '.', items: Number });

          expect(
            await target.transform('1.2.3', {} as ArgumentMetadata),
          ).to.be.deep.equal([1, 2, 3]);

          target = new ParseArrayPipe({ separator: '.', items: Number });

          try {
            await target.transform('1.2.a.null.3', {} as ArgumentMetadata);
            throw null;
          } catch (err) {
            expect(err).to.be.instanceOf(BadRequestException);
            expect(err.getResponse().message).to.deep.equal(
              '[2] item must be a number',
            );
          }

          target = new ParseArrayPipe({ separator: '.', items: Boolean });

          try {
            await target.transform('1.2.a.null.3', {} as ArgumentMetadata);
            throw null;
          } catch (err) {
            expect(err).to.be.instanceOf(BadRequestException);
            expect(err.getResponse().message).to.deep.equal(
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
            expect(err).to.be.instanceOf(BadRequestException);
            expect(err.getResponse().message).to.deep.equal([
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
          expect(item).to.be.instanceOf(ArrItem);
        });

        items = await target.transform('{},{},{}', {} as ArgumentMetadata);
        items.forEach(item => {
          expect(item).to.be.instanceOf(ArrItem);
        });

        target = new ParseArrayPipe({ items: Number });
        expect(
          await target.transform('1,2.0,3', {} as ArgumentMetadata),
        ).to.deep.equal([1, 2, 3]);

        target = new ParseArrayPipe({ items: String });
        expect(
          await target.transform(
            '1,2.0,3,{},true,null,,',
            {} as ArgumentMetadata,
          ),
        ).to.deep.equal(['1', '2.0', '3', '{}', 'true', 'null', '', '']);

        target = new ParseArrayPipe({ items: Boolean });
        expect(
          await target.transform('true,false', {} as ArgumentMetadata),
        ).to.deep.equal([true, false]);
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
          ).to.be.rejectedWith(`[${index}] item must be a number`);
        }

        await expect(
          target.transform([1, true], {} as ArgumentMetadata),
        ).to.be.rejectedWith('[1] item must be a number');
      });
      it('should keep parsing numeric strings when items is Number', async () => {
        target = new ParseArrayPipe({ items: Number });

        expect(
          await target.transform(
            '1, 2,-3.5,1e3,01,+4,.5',
            {} as ArgumentMetadata,
          ),
        ).to.deep.equal([1, 2, -3.5, 1000, 1, 4, 0.5]);
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
          ).to.be.rejectedWith(`[${index}] item must be a number`);
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
          ).to.be.rejectedWith(`[${index}] item must be a boolean value`);
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
        ).to.be.rejectedWith(BadRequestException);
      });
      it('should reject items that are not objects when items is a class', async () => {
        class ArrItemAllOptional {
          @IsOptional()
          @IsNumber()
          number: number;
        }
        target = new ParseArrayPipe({ items: ArrItemAllOptional });

        for (const value of [[[{ number: 1 }]], [7], ['x'], '[{"number":1}]']) {
          const err = await target
            .transform(value, {} as ArgumentMetadata)
            .then(
              () => {
                throw new Error('Expected a rejection');
              },
              err => err,
            );
          expect(err.getResponse().message).to.deep.equal([
            'Validation failed (object is expected)',
          ]);
        }
        const items = await target.transform(
          '{},{"number":1}',
          {} as ArgumentMetadata,
        );
        expect(items).to.deep.equal([{}, { number: 1 }]);
        items.forEach(item =>
          expect(item).to.be.instanceOf(ArrItemAllOptional),
        );
      });
      it('should keep parsing the items of an array', async () => {
        target = new ParseArrayPipe({ items: Number });
        expect(
          await target.transform([1, '2', '3.5'], {} as ArgumentMetadata),
        ).to.deep.equal([1, 2, 3.5]);

        target = new ParseArrayPipe({ items: Boolean });
        expect(
          await target.transform([true, 'false'], {} as ArgumentMetadata),
        ).to.deep.equal([true, false]);
      });
      it('should stop validating at the first invalid item', async () => {
        class ArrItemWithProp {
          @IsDefined()
          number: number;
        }
        target = new ParseArrayPipe({ items: ArrItemWithProp });
        const transform = sinon.spy(target['validationPipe'], 'transform');

        await expect(
          target.transform([{ number: 1 }, {}, {}, {}], {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
        expect(transform.callCount).to.equal(2);
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
        sinon
          .stub(target['validationPipe'], 'transform')
          .callsFake(async (...args) => {
            maxPending = Math.max(maxPending, ++pending);
            try {
              return await transform.apply(target['validationPipe'], args);
            } finally {
              pending--;
            }
          });

        const items = await target.transform(
          [{}, {}, {}],
          {} as ArgumentMetadata,
        );
        expect(items).to.have.length(3);
        items.forEach(item => expect(item).to.be.instanceOf(ArrItem));
        expect(maxPending).to.equal(1);
      });
      it('should leave the input array unchanged', async () => {
        const input = ['1', '2'];
        target = new ParseArrayPipe({ items: Number });

        expect(
          await target.transform(input, {} as ArgumentMetadata),
        ).to.deep.equal([1, 2]);
        expect(input).to.deep.equal(['1', '2']);
      });
      it('should close the gaps of a sparse array and leave the input unchanged', async () => {
        const input = ['1', '2', '3'];
        // eslint-disable-next-line @typescript-eslint/no-array-delete
        delete input[1];
        target = new ParseArrayPipe({ items: Number });

        const result = await target.transform(input, {} as ArgumentMetadata);
        expect(result).to.deep.equal([1, 3]);
        expect(result).to.have.lengthOf(2);
        expect(input).to.have.lengthOf(3);
        expect(1 in input).to.be.false;
      });
      it('should close the gaps of a sparse array when not stopping at the first error', async () => {
        const input: string[] = [];
        input[1] = '9';
        target = new ParseArrayPipe({ items: Number, stopAtFirstError: false });

        expect(
          await target.transform(input, {} as ArgumentMetadata),
        ).to.deep.equal([9]);
      });
      it('should only visit the items of a sparse array, whatever its length', async () => {
        const input: string[] = [];
        input[2 ** 32 - 2] = '1';
        target = new ParseArrayPipe({ items: Number });

        expect(
          await target.transform(input, {} as ArgumentMetadata),
        ).to.deep.equal([1]);
      });
      describe('when "stopAtFirstError" is explicitly turned off', () => {
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
            expect(err).to.be.instanceOf(BadRequestException);
            expect(err.getResponse().message).to.deep.equal([
              '[0] number must be a number conforming to the specified constraints',
              '[1] number must be a number conforming to the specified constraints',
            ]);
          }
        });

        it('should rethrow an error thrown by a transformation', async () => {
          const error = Object.assign(new Error('lookup failed'), {
            code: 'ECONNREFUSED',
            address: '10.0.0.5',
          });
          class ArrItemWithTransform {
            @Transform(({ value }) => {
              if (value === 'unknown') {
                throw error;
              }
              return value;
            })
            @IsString()
            name: string;
          }
          const pipe = new ParseArrayPipe({
            items: ArrItemWithTransform,
            stopAtFirstError: false,
          });

          const thrown = await pipe
            .transform(
              [{ name: 1 }, { name: 'unknown' }] as any[],
              {} as ArgumentMetadata,
            )
            .catch(err => err);
          expect(thrown).to.equal(error);
        });

        it('should rethrow the rejection of an async constraint', async () => {
          const error = new Error('lookup failed');
          @ValidatorConstraint({ name: 'isKnown', async: true })
          class IsKnown implements ValidatorConstraintInterface {
            async validate(value: string) {
              if (value === 'unknown') {
                throw error;
              }
              return true;
            }
          }
          class ArrItemWithConstraint {
            @Validate(IsKnown)
            name: string;
          }
          const exceptionFactory = sinon.spy(
            (errors: any) => new BadRequestException(errors),
          );
          const pipe = new ParseArrayPipe({
            items: ArrItemWithConstraint,
            stopAtFirstError: false,
            exceptionFactory,
          });

          const thrown = await pipe
            .transform(
              [{ name: 'known' }, { name: 'unknown' }] as any[],
              {} as ArgumentMetadata,
            )
            .catch(err => err);
          expect(thrown).to.equal(error);
          expect(exceptionFactory.called).to.be.false;
        });

        it('should rethrow such an error after "maxErrorMessagesLength" is reached', async () => {
          const error = new Error('lookup failed');
          class ArrItemWithTransform {
            @Transform(({ value }) => {
              if (value === 'unknown') {
                throw error;
              }
              return value;
            })
            @IsString()
            name: string;
          }
          const pipe = new ParseArrayPipe({
            items: ArrItemWithTransform,
            stopAtFirstError: false,
            maxErrorMessagesLength: 1,
          });

          const thrown = await pipe
            .transform(
              [{ name: 1 }, { name: 'unknown' }] as any[],
              {} as ArgumentMetadata,
            )
            .catch(err => err);
          expect(thrown).to.equal(error);
        });

        it('should collect the errors without copying them for each item', async () => {
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
          });
          // Concatenating each item's error to the list copies every error
          // collected before it, 4,950 copies for 100 invalid items.
          const concat = sinon.spy(Array.prototype, 'concat');
          let error: any;
          let copied: number;
          try {
            error = await pipe
              .transform(','.repeat(99), {} as ArgumentMetadata)
              .catch(err => err);
            copied = concat.thisValues.reduce(
              (total: number, array: unknown[]) => total + array.length,
              0,
            );
          } finally {
            concat.restore();
          }

          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.getResponse().message).to.have.length(100);
          expect(copied).to.be.lessThan(100);
        });

        class Contact {
          @IsString()
          @IsNotEmpty()
          firstName: string;

          @IsString()
          @IsNotEmpty()
          lastName: string;

          @IsString()
          @IsNotEmpty()
          email: string;

          @IsString()
          @IsNotEmpty()
          phone: string;

          @IsString()
          @IsNotEmpty()
          city: string;
        }

        it('should stop at "maxErrorMessagesLength" characters of messages of all the items', async () => {
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
            maxErrorMessagesLength: 60,
          });
          const isNumeric = sinon.spy(pipe as any, 'isNumeric');

          const error = await pipe
            .transform(','.repeat(99), {} as ArgumentMetadata)
            .catch(err => err);

          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.getResponse().message).to.deep.equal([
            '[0] item must be a number',
            '[1] item must be a number',
            '[2] item must be a number',
            'Further validation errors were omitted',
          ]);
          // the items after the first one left out are not validated
          expect(isNumeric.callCount).to.equal(4);
        });

        it('should not start the limit over for each item with nested errors', async () => {
          class Address {
            @IsString()
            city: string;

            @IsString()
            street: string;
          }
          class ArrItemObject {
            @ValidateNested()
            @Type(() => Address)
            address: Address;
          }
          const pipe = new ParseArrayPipe({
            items: ArrItemObject,
            stopAtFirstError: false,
            maxErrorMessagesLength: 100,
          });

          const error = await pipe
            .transform(
              new Array(100).fill({ address: {} }),
              {} as ArgumentMetadata,
            )
            .catch(err => err);

          expect(error.getResponse().message).to.deep.equal([
            '[0] address.city must be a string',
            '[0] address.street must be a string',
            '[1] address.city must be a string',
            '[1] address.street must be a string',
            'Further validation errors were omitted',
          ]);
        });

        it('should limit the messages of all the items by default', async () => {
          const pipe = new ParseArrayPipe({
            items: Contact,
            stopAtFirstError: false,
          });

          const error = await pipe
            .transform(new Array(10_000).fill({}), {} as ArgumentMetadata)
            .catch(err => err);

          const messages: string[] = error.getResponse().message;
          expect(messages[messages.length - 1]).to.equal(
            'Further validation errors were omitted',
          );
          // about 3 million characters in full
          expect(messages.join('').length).to.be.lessThan(1_001_000);
        });

        it('should not say that errors were omitted when none were left out', async () => {
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
            maxErrorMessagesLength: 10,
          });

          const error = await pipe
            .transform(['a', '1', '2'], {} as ArgumentMetadata)
            .catch(err => err);

          expect(error.getResponse().message).to.deep.equal([
            '[0] item must be a number',
          ]);
        });

        it('should hand every error to a custom exception factory', async () => {
          const exceptionFactory = sinon.spy(
            (errors: any) => new BadRequestException(errors),
          );
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
            maxErrorMessagesLength: 10,
            exceptionFactory,
          });

          const error = await pipe
            .transform(','.repeat(9), {} as ArgumentMetadata)
            .catch(err => err);

          expect(error.getResponse().message).to.have.length(10);
          expect(exceptionFactory.lastCall.firstArg).to.include(
            '[9] item must be a number',
          );
        });

        it('should collect every error when "maxErrorMessagesLength" is Infinity', async () => {
          const pipe = new ParseArrayPipe({
            items: Contact,
            stopAtFirstError: false,
            maxErrorMessagesLength: Infinity,
          });

          const error = await pipe
            .transform(new Array(4_000).fill({}), {} as ArgumentMetadata)
            .catch(err => err);

          const messages: string[] = error.getResponse().message;
          expect(messages).to.have.length(40_000);
          expect(messages.join('').length).to.be.greaterThan(1_000_000);
          expect(messages[messages.length - 1]).to.equal(
            '[3999] city must be a string',
          );
        });

        it('should report every array nested in the array', async () => {
          const pipe = new ParseArrayPipe({
            items: Number,
            stopAtFirstError: false,
          });

          const error = await pipe
            .transform([[1], 2, ['3']], {} as ArgumentMetadata)
            .catch(err => err);

          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.getResponse().message).to.deep.equal([
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
            expect(err).to.be.instanceOf(BadRequestException);
            expect(err.getResponse().message).to.deep.equal([
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
            expect(err).to.be.instanceOf(BadRequestException);
            expect(err.getResponse().message).to.deep.equal([
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
