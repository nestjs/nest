import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { HttpStatus } from '../../enums';
import { UnprocessableEntityException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces';
import { ValidationError } from '../../interfaces/external/validation-error.interface';
import { ValidationPipe } from '../../pipes/validation.pipe';
chai.use(chaiAsPromised);

@Exclude()
class TestModelInternal {
  constructor() {}
  @Expose()
  @IsString()
  public prop1: string;

  @Expose()
  @IsString()
  public prop2: string;

  @Expose({ groups: ['internal'] })
  @IsString()
  @IsOptional()
  public propInternal: string;
}

class TestModel {
  @IsString()
  public prop1: string;

  @IsString()
  public prop2: string;

  @IsOptional()
  @IsString()
  public optionalProp: string;
}

class TestModelNoValidation {
  constructor() {}

  public prop1: string;
  public prop2: string;
  public optionalProp: string;
}

describe('ValidationPipe', () => {
  describe('when errors are nested', () => {
    const nestedErrors: ValidationError[] = [
      {
        property: 'parent',
        children: [
          {
            property: 'child',
            children: [
              {
                property: 'name',
                constraints: { isString: 'name must be a string' },
              },
              {
                property: 'age',
                constraints: { isInt: 'age must be an integer' },
              },
            ],
          },
          {
            property: 'title',
            constraints: { isString: 'title must be a string' },
          },
        ],
      },
    ];
    const list = [
      'parent.child.name must be a string',
      'parent.child.age must be an integer',
      'parent.title must be a string',
    ];

    it('should add them to a single list rather than copy them for each level', () => {
      const pipe = new ValidationPipe();
      const map = sinon.spy(pipe as any, 'mapChildrenToValidationErrors');

      const exception: any = pipe.createExceptionFactory()(nestedErrors);
      expect(exception.getResponse().message).to.deep.equal(list);
      expect(map.callCount).to.equal(2);
      expect(new Set(map.returnValues).size).to.equal(1);
    });
    it('should keep the errors that an override returns', () => {
      class CustomPipe extends ValidationPipe {
        protected mapChildrenToValidationErrors(
          error: ValidationError,
          parentPath?: string,
        ) {
          return [...super.mapChildrenToValidationErrors(error, parentPath)];
        }
      }

      const exception: any = new CustomPipe().createExceptionFactory()(
        nestedErrors,
      );
      expect(exception.getResponse().message).to.deep.equal(list);
    });
  });

  describe('option: "maxErrorMessagesLength"', () => {
    const omitted = 'Further validation errors were omitted';
    const errors: ValidationError[] = [
      { property: 'a', constraints: { isString: 'a must be a string' } },
      {
        property: 'b',
        children: [
          { property: 'c', constraints: { isString: 'c must be a string' } },
          { property: 'd', constraints: { isString: 'd must be a string' } },
        ],
      },
    ];
    const messageOf = (pipe: ValidationPipe, errors: ValidationError[]) =>
      (pipe.createExceptionFactory()(errors) as any).getResponse().message;

    it('should leave out the messages past the limit and say so', () => {
      const pipe = new ValidationPipe({ maxErrorMessagesLength: 30 });
      expect(messageOf(pipe, errors)).to.deep.equal([
        'a must be a string',
        'b.c must be a string',
        omitted,
      ]);
    });
    it('should not read the errors past the limit', () => {
      const reads: string[] = [];
      const children = new Proxy(
        Array.from({ length: 1000 }, (_, i) => ({
          property: `${i}`,
          constraints: { isString: 'must be a string' },
        })),
        {
          get(target, key, receiver) {
            if (typeof key === 'string' && /^\d+$/.test(key)) {
              reads.push(key);
            }
            return Reflect.get(target, key, receiver);
          },
        },
      );
      const pipe = new ValidationPipe({ maxErrorMessagesLength: 50 });

      const message: string[] = messageOf(pipe, [
        { property: 'items', children },
      ]);
      expect(message[message.length - 1]).to.equal(omitted);
      expect(reads.length).to.be.lessThan(10);
    });
    it('should keep every message when the limit is lifted', () => {
      const pipe = new ValidationPipe({ maxErrorMessagesLength: Infinity });
      expect(messageOf(pipe, errors)).to.deep.equal([
        'a must be a string',
        'b.c must be a string',
        'b.d must be a string',
      ]);
    });
    it('should limit the messages to about a million characters by default', () => {
      // 1,200 errors 500 levels deep, each message about 1,000 characters
      // long; the walks recurse once per level, so the depth stays well
      // within the stack of a worker thread.
      let error: any = {
        property: 'x',
        children: Array.from({ length: 1200 }, () => ({
          property: 'y',
          constraints: { isString: 'y must be a string' },
        })),
      };
      for (let depth = 0; depth < 500; depth++) {
        error = { property: 'x', children: [error] };
      }

      const message: string[] = messageOf(new ValidationPipe(), [error]);
      const length = message.reduce((total, item) => total + item.length, 0);
      expect(message[message.length - 1]).to.equal(omitted);
      expect(length).to.be.greaterThan(990_000);
      expect(length).to.be.lessThan(1_010_000);
    });
    it('should add the omission to a copy of the errors', () => {
      class CustomPipe extends ValidationPipe {
        protected flattenValidationErrors(validationErrors: ValidationError[]) {
          return Object.freeze(
            super.flattenValidationErrors(validationErrors),
          ) as string[];
        }
      }

      expect(
        messageOf(new CustomPipe({ maxErrorMessagesLength: 30 }), errors),
      ).to.deep.equal(['a must be a string', 'b.c must be a string', omitted]);
    });
  });

  let target: ValidationPipe;
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestModel,
    data: '',
  };
  const transformMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestModelInternal,
    data: '',
  };

  describe('transform', () => {
    describe('when validation passes', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should return the value unchanged if optional value is not defined', async () => {
        const testObj = { prop1: 'value1', prop2: 'value2' };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set undefined', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: undefined,
        };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is null', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: null,
        };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: 'optional value',
        };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
    });
    describe('when validation fails', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should throw an error', async () => {
        const testObj = { prop1: 'value1' };
        return expect(target.transform(testObj, metadata)).to.be.rejected;
      });

      class TestModel2 {
        @IsString()
        public prop1: string;

        @IsBoolean()
        public prop2: string;

        @IsOptional()
        @IsString()
        public optionalProp: string;
      }
      class TestModelWithNested {
        @IsString()
        prop: string;

        @IsDefined()
        @Type(() => TestModel2)
        @ValidateNested()
        test: TestModel2;
      }
      it('should flatten nested errors', async () => {
        try {
          const model = new TestModelWithNested();
          model.test = new TestModel2();
          await target.transform(model, {
            type: 'body',
            metatype: TestModelWithNested,
          });
        } catch (err) {
          expect(err.getResponse().message).to.be.eql([
            'prop must be a string',
            'test.prop1 must be a string',
            'test.prop2 must be a boolean value',
          ]);
        }
      });

      class TestModelForNestedArrayValidation {
        @IsString()
        public prop: string;

        @IsArray()
        @ValidateNested()
        @Type(() => TestModel2)
        public test: TestModel2[];
      }
      it('should provide complete path for nested errors', async () => {
        try {
          const model = new TestModelForNestedArrayValidation();
          model.test = [new TestModel2()];
          await target.transform(model, {
            type: 'body',
            metatype: TestModelForNestedArrayValidation,
          });
        } catch (err) {
          expect(err.getResponse().message).to.be.eql([
            'prop must be a string',
            'test.0.prop1 must be a string',
            'test.0.prop2 must be a boolean value',
          ]);
        }
      });
    });
    describe('when validation transforms', () => {
      it('should return a TestModel instance', async () => {
        target = new ValidationPipe({ transform: true });
        const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
        expect(await target.transform(testObj, metadata)).to.be.instanceOf(
          TestModel,
        );
      });
      describe('when input is a query parameter (number)', () => {
        it('should parse to number', async () => {
          target = new ValidationPipe({ transform: true });
          const value = '3.14';

          expect(
            await target.transform(value, {
              metatype: Number,
              data: 'test',
              type: 'query',
            }),
          ).to.be.equal(+value);
        });
        it('should parse undefined to undefined', async () => {
          target = new ValidationPipe({ transform: true });
          const value = undefined;

          expect(
            await target.transform(value, {
              metatype: Number,
              data: 'test',
              type: 'query',
            }),
          ).to.be.undefined;
        });
      });
      describe('when input is a path parameter (number)', () => {
        it('should parse to number', async () => {
          target = new ValidationPipe({ transform: true });
          const value = '3.14';

          expect(
            await target.transform(value, {
              metatype: Number,
              data: 'test',
              type: 'param',
            }),
          ).to.be.equal(+value);
        });
        it('should parse undefined to undefined', async () => {
          target = new ValidationPipe({ transform: true });
          const value = undefined;

          expect(
            await target.transform(value, {
              metatype: Number,
              data: 'test',
              type: 'param',
            }),
          ).to.be.undefined;
        });
      });
      describe('when input is a query parameter (boolean)', () => {
        it('should parse the string "true" to the boolean true', async () => {
          target = new ValidationPipe({ transform: true });
          const value = 'true';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'query',
            }),
          ).to.be.true;
        });
        it('should parse the string "false" to the boolean false', async () => {
          target = new ValidationPipe({ transform: true });
          const value = 'false';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'query',
            }),
          ).to.be.false;
        });
        it('should parse an empty string to false', async () => {
          target = new ValidationPipe({ transform: true });
          const value = '';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'query',
            }),
          ).to.be.false;
        });
        it('should parse undefined to undefined', async () => {
          target = new ValidationPipe({ transform: true });
          const value = undefined;

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'query',
            }),
          ).to.be.undefined;
        });
      });
      describe('when input is a path parameter (boolean)', () => {
        it('should parse the string "true" to boolean true', async () => {
          target = new ValidationPipe({ transform: true });
          const value = 'true';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'param',
            }),
          ).to.be.true;
        });
        it('should parse the string "false" to boolean false', async () => {
          target = new ValidationPipe({ transform: true });
          const value = 'false';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'param',
            }),
          ).to.be.false;
        });
        it('should parse an empty string to false', async () => {
          target = new ValidationPipe({ transform: true });
          const value = '';

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'param',
            }),
          ).to.be.false;
        });
        it('should parse undefined to undefined', async () => {
          target = new ValidationPipe({ transform: true });
          const value = undefined;

          expect(
            await target.transform(value, {
              metatype: Boolean,
              data: 'test',
              type: 'param',
            }),
          ).to.be.undefined;
        });
      });
      describe('when validation strips', () => {
        it('should return a TestModel without extra properties', async () => {
          target = new ValidationPipe({ whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(
            await target.transform(testObj, metadata),
          ).to.not.be.instanceOf(TestModel);
          expect(
            await target.transform(testObj, metadata),
          ).to.not.have.property('prop3');
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', () => {
          target = new ValidationPipe({
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).to.eventually.be.rejected;
        });
      });
      describe('when transformation is internal', () => {
        it('should return a TestModel with internal property', async () => {
          target = new ValidationPipe({
            transform: true,
            transformOptions: { groups: ['internal'] },
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3',
          };
          expect(
            await target.transform(testObj, transformMetadata),
          ).to.have.property('propInternal');
        });
      });
      describe('when transformation is external', () => {
        it('should return a TestModel without internal property', async () => {
          target = new ValidationPipe({
            transform: true,
            transformOptions: { groups: ['external'] },
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3',
          };
          expect(
            await target.transform(testObj, transformMetadata),
          ).to.not.have.property('propInternal');
        });
      });
    });
    describe('when validation does not transform', () => {
      describe('when validation strips', () => {
        it('should return a plain object without extra properties', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          const result = await target.transform(testObj, metadata);

          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.not.have.property('optionalProp');
        });
        it('should return a plain object without extra properties if optional prop is defined', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: 'optional value',
          };
          const result = await target.transform(testObj, metadata);
          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.have.property('optionalProp');
        });
        it('should return a plain object without extra properties if optional prop is undefined', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: undefined,
          };
          const result = await target.transform(testObj, metadata);
          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.have.property('optionalProp');
        });
        it('should return a plain object without extra properties if optional prop is null', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: null,
          };

          const result = await target.transform(testObj, metadata);
          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.have.property('optionalProp');
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', () => {
          target = new ValidationPipe({
            transform: false,
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).to.eventually.be.rejected;
        });
      });
    });
    describe("when type doesn't match", () => {
      describe('when validation rules are applied', () => {
        it('should throw an error', async () => {
          target = new ValidationPipe();
          const testObj = [
            { prop1: 'value1', prop2: 'value2', prop3: 'value3' },
          ];

          expect(target.transform(testObj, metadata)).to.eventually.be.rejected;
          expect(target.transform('string', metadata)).to.eventually.be
            .rejected;
          expect(target.transform(true, metadata)).to.eventually.be.rejected;
          expect(target.transform(3, metadata)).to.eventually.be.rejected;
        });
      });
      describe('when no validation rule is required', () => {
        class TestModelAllOptional {
          @IsOptional()
          @IsString()
          public prop1: string;
        }
        const optionalMetadata: ArgumentMetadata = {
          type: 'body',
          metatype: TestModelAllOptional,
          data: '',
        };
        const rejection = ['Validation failed (object is expected)'];
        const rejectionOf = (promise: Promise<unknown>) =>
          promise.then(
            () => {
              throw new Error('Expected a rejection');
            },
            err => err,
          );

        it('should throw an error for an array or a primitive', async () => {
          for (const options of [
            {},
            { transform: true },
            { whitelist: true },
            { forbidUnknownValues: true },
          ]) {
            target = new ValidationPipe(options);
            for (const value of [[], [{ prop1: 1 }], 'string', 3, true]) {
              const err = await rejectionOf(
                target.transform(value, optionalMetadata),
              );
              expect(err.getResponse().message).to.deep.equal(rejection);
            }
          }
        });
        it('should throw an error for an empty array when non-whitelisted properties are forbidden', async () => {
          target = new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
          });
          const err = await rejectionOf(target.transform([], optionalMetadata));
          expect(err.getResponse().message).to.deep.equal(rejection);
        });
        it('should pass the error to the exception factory', async () => {
          target = new ValidationPipe({ exceptionFactory: errors => errors });
          await expect(
            target.transform([], { ...optionalMetadata, data: 'items' }),
          ).to.be.rejected.and.eventually.deep.equal([
            {
              property: 'items',
              constraints: {
                isObject: 'Validation failed (object is expected)',
              },
              children: [],
            },
          ]);
        });
        it('should not throw an error for an object', async () => {
          target = new ValidationPipe({ transform: true });
          expect(
            await target.transform({ prop1: 'value1' }, optionalMetadata),
          ).to.be.instanceOf(TestModelAllOptional);
          expect(
            await target.transform(undefined, optionalMetadata),
          ).to.be.instanceOf(TestModelAllOptional);
        });
      });
      describe('when missing properties are skipped', () => {
        it('should throw an error for an array or a primitive', async () => {
          target = new ValidationPipe({ skipMissingProperties: true });
          for (const value of [
            [],
            [{ prop1: 'value1', prop2: 'value2' }],
            'string',
          ]) {
            const err = await target.transform(value, metadata).then(
              () => {
                throw new Error('Expected a rejection');
              },
              err => err,
            );
            expect(err.getResponse().message).to.deep.equal([
              'Validation failed (object is expected)',
            ]);
          }
        });
      });
      describe('when the transformer returns plain objects', () => {
        it('should not throw an error for an object', async () => {
          target = new ValidationPipe({
            transformerPackage: {
              plainToInstance: (_metatype, plain) =>
                ({ ...(plain as object) }) as any,
              classToPlain: object => object as object,
            },
          });
          const testObj = { prop1: 'value1', prop2: 'value2' };
          expect(await target.transform(testObj, metadata)).to.equal(testObj);
        });
      });
      describe('when the metatype is not a class', () => {
        it('should not throw an error', async () => {
          // SWC passes an enum object as the metatype of an enum parameter
          const Role = { Admin: 'admin' };
          target = new ValidationPipe();
          const enumMetadata = {
            type: 'query',
            metatype: Role,
            data: 'role',
          } as unknown as ArgumentMetadata;

          expect(await target.transform('admin', enumMetadata)).to.equal(
            'admin',
          );
          expect(await target.transform(undefined, enumMetadata)).to.be
            .undefined;
        });
      });
      describe('otherwise', () => {
        it('should not reject', async () => {
          target = new ValidationPipe();
          const testObj = [
            { prop1: 'value1', prop2: 'value2', prop3: 'value3' },
          ];

          const objMetadata = { ...metadata, metatype: TestModelNoValidation };
          const result = await target.transform(testObj, objMetadata);

          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.be.eql(testObj);

          // primitives
          expect(await target.transform('string', objMetadata)).to.be.eql(
            'string',
          );
          expect(await target.transform(3, objMetadata)).to.be.eql(3);
          expect(await target.transform(true, objMetadata)).to.be.eql(true);
        });
      });
    });
  });

  describe('option: "validateCustomDecorators" when metadata.type is not `body`', () => {
    describe('when is set to `true`', () => {
      it('should transform and validate', async () => {
        const target = new ValidationPipe({
          validateCustomDecorators: true,
        });

        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: TestModel,
          data: '',
        };

        const testObj = { prop1: 'value1', prop2: 'value2' };
        expect(await target.transform(testObj, metadata)).to.not.be.undefined;
      });
    });
    describe('when is set to `false`', () => {
      it('should throw an error', async () => {
        const target = new ValidationPipe({
          validateCustomDecorators: false,
        });

        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: TestModel,
          data: '',
        };

        const objNotFollowingTestModel = { prop1: undefined, prop2: 'value2' };
        expect(await target.transform(objNotFollowingTestModel, metadata)).to
          .not.be.undefined;
      });
    });
    describe('when is not supplied', () => {
      it('should transform and validate', async () => {
        const target = new ValidationPipe({});

        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: TestModel,
          data: '',
        };

        const testObj = { prop1: 'value1', prop2: 'value2' };
        expect(await target.transform(testObj, metadata)).to.not.be.undefined;
      });
    });
  });

  describe('option: "errorHttpStatusCode"', () => {
    describe('when validation fails', () => {
      beforeEach(() => {
        target = new ValidationPipe({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        });
      });
      it('should throw an error', async () => {
        const testObj = { prop1: 'value1' };
        try {
          await target.transform(testObj, metadata);
        } catch (err) {
          expect(err).to.be.instanceOf(UnprocessableEntityException);
        }
      });
    });
  });

  describe('option: "validationError"', () => {
    class Item {
      @IsString()
      name: string;
    }
    class Order {
      @ValidateNested({ each: true })
      @Type(() => Item)
      items: Item[];
    }
    const orderMetadata: ArgumentMetadata = { type: 'body', metatype: Order };
    const orderOf = (length: number) => ({
      items: Array.from({ length }, () => ({ name: 1 })),
    });
    const exceptionFactory = (errors: ValidationError[]) => errors;

    it('should not expose the target of the errors by default', async () => {
      target = new ValidationPipe({ exceptionFactory });

      await expect(
        target.transform(orderOf(1), orderMetadata),
      ).to.be.rejected.and.eventually.deep.equal([
        {
          property: 'items',
          value: [{ name: 1 }],
          children: [
            {
              property: '0',
              value: { name: 1 },
              children: [
                {
                  property: 'name',
                  value: 1,
                  children: [],
                  constraints: { isString: 'name must be a string' },
                },
              ],
            },
          ],
        },
      ]);
    });
    it('should not expose the target of non-whitelisted properties by default', async () => {
      target = new ValidationPipe({
        exceptionFactory,
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      const errors: ValidationError[] = await target
        .transform({ items: [], a: 1, b: 2 }, orderMetadata)
        .catch(err => err);
      expect(errors.map(error => error.property)).to.deep.equal(['a', 'b']);
      errors.forEach(error => expect(error).to.not.have.property('target'));
    });
    it('should not repeat the validated array in each of its errors', async () => {
      target = new ValidationPipe({ exceptionFactory });
      const sizeOfErrors = async (length: number) =>
        JSON.stringify(
          await target
            .transform(orderOf(length), orderMetadata)
            .catch(err => err),
        ).length;

      expect(await sizeOfErrors(200)).to.be.lessThan(
        3 * (await sizeOfErrors(100)),
      );
    });
    it('should expose the target when asked to', async () => {
      target = new ValidationPipe({
        exceptionFactory,
        validationError: { target: true },
      });

      const [error]: ValidationError[] = await target
        .transform(orderOf(1), orderMetadata)
        .catch(err => err);
      expect(error.target).to.deep.equal(orderOf(1));
      expect(error.children![0].target).to.deep.equal(orderOf(1).items);
    });
    it('should keep the other "validationError" options', async () => {
      target = new ValidationPipe({
        exceptionFactory,
        validationError: { value: false },
      });

      const [error]: ValidationError[] = await target
        .transform(orderOf(1), orderMetadata)
        .catch(err => err);
      expect(error).to.not.have.property('value');
      expect(error).to.not.have.property('target');
    });
  });

  describe('option: "expectedType"', () => {
    class TestModel2 {
      @IsString()
      public prop1: string;

      @IsBoolean()
      public prop2: boolean;

      @IsOptional()
      @IsString()
      public optionalProp: string;
    }

    it('should validate against the expected type if presented', async () => {
      const m: ArgumentMetadata = {
        type: 'body',
        metatype: TestModel2,
        data: '',
      };

      target = new ValidationPipe({ expectedType: TestModel });
      const testObj = { prop1: 'value1', prop2: 'value2' };

      expect(await target.transform(testObj, m)).to.deep.equal(testObj);
    });

    it('should validate against the expected type if presented and metatype is primitive type', async () => {
      const m: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: '',
      };

      target = new ValidationPipe({ expectedType: TestModel });
      const testObj = { prop1: 'value1', prop2: 'value2' };

      expect(await target.transform(testObj, m)).to.deep.equal(testObj);
    });
  });
  describe('stripProtoKeys', () => {
    beforeEach(() => {
      target = new ValidationPipe();
    });

    describe('with built-in JavaScript primitives', () => {
      it('should not throw error when processing Date objects', () => {
        const value = { date: new Date() };
        expect(() => target['stripProtoKeys'](value)).to.not.throw();
      });

      it('should not throw error when processing RegExp objects', () => {
        const value = { regex: /test/i };
        expect(() => target['stripProtoKeys'](value)).to.not.throw();
      });

      it('should not throw error when processing Error objects', () => {
        const value = { error: new Error('test') };
        expect(() => target['stripProtoKeys'](value)).to.not.throw();
      });

      it('should not throw error when processing Map objects', () => {
        const value = { map: new Map() };
        expect(() => target['stripProtoKeys'](value)).to.not.throw();
      });

      it('should not throw error when processing Set objects', () => {
        const value = { set: new Set() };
        expect(() => target['stripProtoKeys'](value)).to.not.throw();
      });

      it('should preserve Date object properties', () => {
        const date = new Date();
        const value = { date };
        target['stripProtoKeys'](value);
        expect(value.date).to.equal(date);
        expect(value.date.constructor).to.equal(Date);
      });
    });

    describe('with plain objects', () => {
      it('should still strip constructor from regular objects', () => {
        const value = { nested: { constructor: 'malicious' } };
        target['stripProtoKeys'](value);
        // Check if 'constructor' is NOT an own property
        expect(value.nested).to.not.have.ownProperty('constructor');
      });

      it('should strip constructor whatever its value', () => {
        for (const constructor of [null, 0, false, '']) {
          const value = { constructor, nested: { constructor } };
          target['stripProtoKeys'](value);
          expect(Object.keys(value)).to.deep.equal(['nested']);
          expect(Object.keys(value.nested)).to.deep.equal([]);
        }
      });

      it('should leave objects without a prototype as they are', () => {
        const value = Object.assign(Object.create(null), { id: 1 });
        target['stripProtoKeys'](value);
        expect(value).to.deep.equal({ id: 1 });
      });

      it('should strip __proto__ from objects', () => {
        const value = { __proto__: { malicious: 'code' } };
        target['stripProtoKeys'](value);
        expect(value).to.not.have.ownProperty('__proto__');
      });

      it('should strip prototype from objects', () => {
        const value = { prototype: { malicious: 'code' } };
        target['stripProtoKeys'](value);
        expect(value).to.not.have.ownProperty('prototype');
      });

      it('should recursively strip nested objects', () => {
        const value = {
          level1: {
            constructor: 'malicious',
            level2: {
              constructor: 'alsoMalicious',
            },
          },
        };
        target['stripProtoKeys'](value);
        expect(value.level1).to.not.have.ownProperty('constructor');
        expect(value.level1.level2).to.not.have.ownProperty('constructor');
      });
    });

    describe('with arrays', () => {
      it('should process arrays recursively', () => {
        const value = {
          items: [
            { constructor: 'malicious' },
            { constructor: 'alsoMalicious' },
          ],
        };
        target['stripProtoKeys'](value);
        expect(value.items[0]).to.not.have.ownProperty('constructor');
        expect(value.items[1]).to.not.have.ownProperty('constructor');
      });

      it('should not throw error when array contains Date objects', () => {
        const value = { dates: [new Date(), new Date()] };
        expect(() => target['stripProtoKeys'](value)).to.not.throw();
      });

      it('should only read the items of a sparse array, not every index', () => {
        const items: any[] = [];
        items[999] = { constructor: 'malicious' };
        const reads: PropertyKey[] = [];
        const value = {
          items: new Proxy(items, {
            get(target, key, receiver) {
              reads.push(key);
              return Reflect.get(target, key, receiver);
            },
          }),
        };
        target['stripProtoKeys'](value);
        expect(reads).to.deep.equal(['999']);
        expect(items[999]).to.not.have.ownProperty('constructor');
      });

      it('should strip the items of a sparse array with the largest index', () => {
        const items: any[] = [];
        items[2 ** 32 - 2] = { constructor: 'malicious' };
        target['stripProtoKeys']({ items });
        expect(items).to.have.length(2 ** 32 - 1);
        expect(items[2 ** 32 - 2]).to.not.have.ownProperty('constructor');
      });
    });

    describe('Issue #16195: Jest useFakeTimers compatibility', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });

      it('should handle Date objects with non-configurable constructor', () => {
        const value = { date: new Date() };

        // Make constructor non-configurable like Jest does
        Object.defineProperty(value.date, 'constructor', {
          value: Date,
          writable: false,
          enumerable: false,
          configurable: false,
        });

        // This should NOT throw "Cannot delete property 'constructor'"
        expect(() => target['stripProtoKeys'](value)).to.not.throw();
      });

      it('should not attempt to delete constructor from built-in types', () => {
        const testCases = [
          { date: new Date() },
          { regex: /test/i },
          { error: new Error('test') },
          { map: new Map() },
          { set: new Set() },
        ];

        testCases.forEach(testCase => {
          expect(() => target['stripProtoKeys'](testCase)).to.not.throw();
        });
      });
    });
  });
  describe('Issue #17398: when only ValidationPipe-specific options are provided', () => {
    it('should return the original value when exceptionFactory is provided', async () => {
      target = new ValidationPipe({
        exceptionFactory: () => new Error('custom'),
      });
      const testObj = { prop1: 'value1', prop2: 'value2' };
      const result = await target.transform(testObj, metadata);
      expect(result).to.equal(testObj);
    });

    it('should return the original value when validatorPackage is provided', async () => {
      target = new ValidationPipe({
        validatorPackage: require('class-validator'),
      });
      const testObj = { prop1: 'value1', prop2: 'value2' };
      const result = await target.transform(testObj, metadata);
      expect(result).to.equal(testObj);
    });

    it('should return the original value when transformerPackage is provided', async () => {
      target = new ValidationPipe({
        transformerPackage: require('class-transformer'),
      });
      const testObj = { prop1: 'value1', prop2: 'value2' };
      const result = await target.transform(testObj, metadata);
      expect(result).to.equal(testObj);
    });

    it('should return the original value when maxErrorMessagesLength is provided', async () => {
      target = new ValidationPipe({ maxErrorMessagesLength: 1000 });
      const testObj = { prop1: 'value1', prop2: 'value2' };
      const result = await target.transform(testObj, metadata);
      expect(result).to.equal(testObj);
    });
  });
});
