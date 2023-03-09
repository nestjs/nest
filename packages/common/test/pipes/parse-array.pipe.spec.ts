import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDefined,
  IsNumber,
  IsString,
  ValidateNested,
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
