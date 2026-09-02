import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { HttpStatus } from '../../enums/index.js';
import { UnprocessableEntityException } from '../../exceptions/index.js';
import { ArgumentMetadata } from '../../interfaces/index.js';
import { ValidationPipe } from '../../pipes/validation.pipe.js';

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
        expect(await target.transform(testObj, {} as any)).toBe(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set undefined', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: undefined,
        };
        expect(await target.transform(testObj, {} as any)).toBe(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is null', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: null,
        };
        expect(await target.transform(testObj, {} as any)).toBe(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: 'optional value',
        };
        expect(await target.transform(testObj, {} as any)).toBe(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).not.toBeInstanceOf(TestModel);
      });
    });
    describe('when validation fails', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should throw an error', async () => {
        const testObj = { prop1: 'value1' };
        return expect(
          target.transform(testObj, metadata),
        ).rejects.toBeDefined();
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
          expect(err.getResponse().message).toEqual([
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
          expect(err.getResponse().message).toEqual([
            'prop must be a string',
            'test.0.prop1 must be a string',
            'test.0.prop2 must be a boolean value',
          ]);
        }
      });

      describe('when errorFormat is "grouped"', () => {
        beforeEach(() => {
          target = new ValidationPipe({ errorFormat: 'grouped' });
        });

        it('should return grouped errors with property paths as keys', async () => {
          try {
            const model = new TestModelWithNested();
            model.test = new TestModel2();
            await target.transform(model, {
              type: 'body',
              metatype: TestModelWithNested,
            });
          } catch (err) {
            expect(err.getResponse().message).toEqual({
              prop: ['prop must be a string'],
              'test.prop1': ['prop1 must be a string'],
              'test.prop2': ['prop2 must be a boolean value'],
            });
          }
        });

        it('should return grouped errors for nested arrays', async () => {
          try {
            const model = new TestModelForNestedArrayValidation();
            model.test = [new TestModel2()];
            await target.transform(model, {
              type: 'body',
              metatype: TestModelForNestedArrayValidation,
            });
          } catch (err) {
            expect(err.getResponse().message).toEqual({
              prop: ['prop must be a string'],
              'test.0.prop1': ['prop1 must be a string'],
              'test.0.prop2': ['prop2 must be a boolean value'],
            });
          }
        });

        class NestedChildWithCustomMessage {
          @IsNotEmpty({ message: 'Name is required' })
          @IsString({ message: 'Name must be a string' })
          name: string;
        }

        class ParentWithCustomMessage {
          @IsString()
          title: string;

          @IsDefined()
          @Type(() => NestedChildWithCustomMessage)
          @ValidateNested()
          child: NestedChildWithCustomMessage;
        }

        it('should preserve custom validation messages without prepending parent path', async () => {
          try {
            const model = new ParentWithCustomMessage();
            model.child = new NestedChildWithCustomMessage();
            await target.transform(model, {
              type: 'body',
              metatype: ParentWithCustomMessage,
            });
          } catch (err) {
            const message = err.getResponse().message;
            expect(message.title).toEqual(['title must be a string']);
            // Custom messages should be preserved without 'child.' prefix in the message itself
            expect(message['child.name']).toEqual(
              expect.arrayContaining([
                'Name is required',
                'Name must be a string',
              ]),
            );
            // Verify custom messages don't have parent path prepended
            expect(message['child.name']).not.toEqual(
              expect.arrayContaining([
                'child.Name is required',
                'child.Name must be a string',
              ]),
            );
          }
        });
      });
    });
    describe('when validation transforms', () => {
      it('should return a TestModel instance', async () => {
        target = new ValidationPipe({ transform: true });
        const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
        expect(await target.transform(testObj, metadata)).toBeInstanceOf(
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
          ).toBe(+value);
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
          ).toBeUndefined();
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
          ).toBe(+value);
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
          ).toBeUndefined();
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
          ).toBe(true);
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
          ).toBe(false);
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
          ).toBe(false);
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
          ).toBeUndefined();
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
          ).toBe(true);
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
          ).toBe(false);
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
          ).toBe(false);
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
          ).toBeUndefined();
        });
      });
      describe('when validation strips', () => {
        it('should return a TestModel without extra properties', async () => {
          target = new ValidationPipe({ whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(await target.transform(testObj, metadata)).not.toBeInstanceOf(
            TestModel,
          );
          expect(await target.transform(testObj, metadata)).not.toHaveProperty(
            'prop3',
          );
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', async () => {
          target = new ValidationPipe({
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          await expect(
            target.transform(testObj, metadata),
          ).rejects.toBeDefined();
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
          ).toHaveProperty('propInternal');
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
          ).not.toHaveProperty('propInternal');
        });
      });
    });
    describe('when validation does not transform', () => {
      describe('when validation strips', () => {
        it('should return a plain object without extra properties', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          const result = await target.transform(testObj, metadata);

          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toHaveProperty('prop3');
          expect(result).not.toHaveProperty('optionalProp');
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
          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toHaveProperty('prop3');
          expect(result).toHaveProperty('optionalProp');
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
          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toHaveProperty('prop3');
          expect(result).toHaveProperty('optionalProp');
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
          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).not.toHaveProperty('prop3');
          expect(result).toHaveProperty('optionalProp');
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', async () => {
          target = new ValidationPipe({
            transform: false,
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          await expect(
            target.transform(testObj, metadata),
          ).rejects.toBeDefined();
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

          await expect(
            target.transform(testObj, metadata),
          ).rejects.toBeDefined();
          await expect(
            target.transform('string', metadata),
          ).rejects.toBeDefined();
          await expect(target.transform(true, metadata)).rejects.toBeDefined();
          await expect(target.transform(3, metadata)).rejects.toBeDefined();
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

          expect(result).not.toBeInstanceOf(TestModel);
          expect(result).toEqual(testObj);

          // primitives
          expect(await target.transform('string', objMetadata)).toEqual(
            'string',
          );
          expect(await target.transform(3, objMetadata)).toEqual(3);
          expect(await target.transform(true, objMetadata)).toEqual(true);
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
        expect(await target.transform(testObj, metadata)).not.toBeUndefined();
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
        expect(await target.transform(testObj, metadata)).not.toBeUndefined();
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
          expect(err).toBeInstanceOf(UnprocessableEntityException);
        }
      });
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

      expect(await target.transform(testObj, m)).toEqual(testObj);
    });

    it('should validate against the expected type if presented and metatype is primitive type', async () => {
      const m: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: '',
      };

      target = new ValidationPipe({ expectedType: TestModel });
      const testObj = { prop1: 'value1', prop2: 'value2' };

      expect(await target.transform(testObj, m)).toEqual(testObj);
    });
  });
  describe('Issue #17398: when only ValidationPipe-specific options are provided', () => {
    it('should return the original value when exceptionFactory is provided', async () => {
      target = new ValidationPipe({
        exceptionFactory: () => new Error('custom'),
      });
      const testObj = { prop1: 'value1', prop2: 'value2' };
      const result = await target.transform(testObj, metadata);
      expect(result).toBe(testObj);
    });

    it('should return the original value when validatorPackage is provided', async () => {
      target = new ValidationPipe({
        validatorPackage: require('class-validator'),
      });
      const testObj = { prop1: 'value1', prop2: 'value2' };
      const result = await target.transform(testObj, metadata);
      expect(result).toBe(testObj);
    });

    it('should return the original value when transformerPackage is provided', async () => {
      target = new ValidationPipe({
        transformerPackage: require('class-transformer'),
      });
      const testObj = { prop1: 'value1', prop2: 'value2' };
      const result = await target.transform(testObj, metadata);
      expect(result).toBe(testObj);
    });
  });

  describe('subclass compatibility', () => {
    it('should allow subclasses to call super.stripProtoKeys', () => {
      class CustomPipe extends ValidationPipe {
        public callSuperStripProtoKeys(value: any) {
          super.stripProtoKeys(value);
        }
      }
      const pipe = new CustomPipe();
      const value = { constructor: 'malicious' };
      expect(() => pipe.callSuperStripProtoKeys(value)).not.toThrow();
      expect(value).not.toHaveProperty('constructor');
    });
  });
});
