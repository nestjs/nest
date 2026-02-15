import type { StandardSchemaV1 } from '@standard-schema/spec';
import { HttpException, HttpStatus } from '../../index.js';
import { ArgumentMetadata } from '../../interfaces/index.js';
import { StandardSchemaValidationPipe } from '../../pipes/standard-schema-validation.pipe.js';

function createSchema(
  validateFn: (
    value: unknown,
  ) => StandardSchemaV1.Result<any> | Promise<StandardSchemaV1.Result<any>>,
): StandardSchemaV1 {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: validateFn,
    },
  };
}

describe('StandardSchemaValidationPipe', () => {
  let pipe: StandardSchemaValidationPipe;

  beforeEach(() => {
    pipe = new StandardSchemaValidationPipe();
  });

  describe('transform', () => {
    describe('when no schema is present in metadata', () => {
      it('should return the value unchanged', async () => {
        const value = { name: 'test' };
        const result = await pipe.transform(value, {
          type: 'body',
        } as ArgumentMetadata);
        expect(result).toBe(value);
      });
    });

    describe('when schema validation succeeds', () => {
      it('should return the validated value', async () => {
        const schema = createSchema(value => ({ value }));
        const result = await pipe.transform({ name: 'test' }, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(result).toEqual({ name: 'test' });
      });

      it('should return the transformed value from schema', async () => {
        const schema = createSchema(value => ({
          value: { ...(value as any), extra: true },
        }));
        const result = await pipe.transform({ name: 'test' }, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(result).toEqual({ name: 'test', extra: true });
      });
    });

    describe('when schema validation succeeds asynchronously', () => {
      it('should return the validated value', async () => {
        const schema = createSchema(async value => ({ value }));
        const result = await pipe.transform({ name: 'test' }, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(result).toEqual({ name: 'test' });
      });
    });

    describe('when schema validation fails', () => {
      it('should throw a BadRequestException with issue messages', async () => {
        const schema = createSchema(() => ({
          issues: [
            { message: 'field is required', path: ['name'] },
            { message: 'must be a string' },
          ],
        }));

        await expect(
          pipe.transform({}, { type: 'body', schema } as ArgumentMetadata),
        ).rejects.toThrow();

        try {
          await pipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(
            HttpStatus.BAD_REQUEST,
          );
          expect((error as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: ['field is required', 'must be a string'],
            error: 'Bad Request',
          });
        }
      });

      it('should throw asynchronously when schema validation fails async', async () => {
        const schema = createSchema(async () => ({
          issues: [{ message: 'invalid' }],
        }));

        await expect(
          pipe.transform({}, { type: 'body', schema } as ArgumentMetadata),
        ).rejects.toThrow();
      });
    });

    describe('when custom errorHttpStatusCode is provided', () => {
      it('should throw with the custom status code', async () => {
        const customPipe = new StandardSchemaValidationPipe({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        });
        const schema = createSchema(() => ({
          issues: [{ message: 'invalid' }],
        }));

        try {
          await customPipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
      });
    });

    describe('when custom exceptionFactory is provided', () => {
      it('should use the custom exception factory', async () => {
        class CustomError extends Error {
          constructor(
            public readonly issues: readonly StandardSchemaV1.Issue[],
          ) {
            super('Custom validation error');
          }
        }

        const customPipe = new StandardSchemaValidationPipe({
          exceptionFactory: issues => new CustomError(issues),
        });
        const schema = createSchema(() => ({
          issues: [{ message: 'invalid' }],
        }));

        try {
          await customPipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect(error).toBeInstanceOf(CustomError);
          expect((error as CustomError).issues).toEqual([
            { message: 'invalid' },
          ]);
        }
      });
    });

    describe('when transform is enabled (default)', () => {
      it('should return the schema-produced value', async () => {
        const input = { name: 'test' };
        const schema = createSchema(value => ({
          value: { ...(value as any), coerced: true },
        }));
        const result = await pipe.transform(input, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(result).toEqual({ name: 'test', coerced: true });
      });
    });

    describe('when transform is explicitly set to true', () => {
      it('should return the schema-produced value', async () => {
        const transformPipe = new StandardSchemaValidationPipe({
          transform: true,
        });
        const input = { name: 'test' };
        const schema = createSchema(value => ({
          value: { ...(value as any), coerced: true },
        }));
        const result = await transformPipe.transform(input, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(result).toEqual({ name: 'test', coerced: true });
      });
    });

    describe('when transform is disabled', () => {
      it('should return the original input value', async () => {
        const noTransformPipe = new StandardSchemaValidationPipe({
          transform: false,
        });
        const input = { name: 'test' };
        const schema = createSchema(value => ({
          value: { ...(value as any), coerced: true },
        }));
        const result = await noTransformPipe.transform(input, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(result).toBe(input);
        expect(result).toEqual({ name: 'test' });
      });
    });

    describe('toValidate', () => {
      it('should skip validation for custom decorators by default', async () => {
        const schema = createSchema(() => ({
          issues: [{ message: 'should not be reached' }],
        }));
        const result = await pipe.transform({ name: 'test' }, {
          type: 'custom',
          schema,
        } as ArgumentMetadata);
        expect(result).toEqual({ name: 'test' });
      });

      it('should validate custom decorators when validateCustomDecorators is true', async () => {
        const customPipe = new StandardSchemaValidationPipe({
          validateCustomDecorators: true,
        });
        const schema = createSchema(() => ({
          issues: [{ message: 'invalid' }],
        }));

        await expect(
          customPipe.transform({}, {
            type: 'custom',
            schema,
          } as ArgumentMetadata),
        ).rejects.toThrow();
      });

      it('should always validate body/query/param types', async () => {
        const schema = createSchema(value => ({ value }));
        for (const type of ['body', 'query', 'param'] as const) {
          const result = await pipe.transform({ ok: true }, {
            type,
            schema,
          } as ArgumentMetadata);
          expect(result).toEqual({ ok: true });
        }
      });
    });

    describe('validate', () => {
      it('should be overridable', async () => {
        class CustomPipe extends StandardSchemaValidationPipe {
          protected validate(
            value: unknown,
            schema: StandardSchemaV1,
            options?: Record<string, unknown>,
          ) {
            // Always succeed with a custom value
            return {
              value: 'custom-result',
            } as StandardSchemaV1.Result<unknown>;
          }
        }
        const customPipe = new CustomPipe();
        const schema = createSchema(() => ({
          issues: [{ message: 'should not be reached' }],
        }));
        const result = await customPipe.transform('anything', {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(result).toBe('custom-result');
      });

      it('should forward validateOptions to the schema validate function', async () => {
        let receivedOptions: unknown;
        const schema: StandardSchemaV1 = {
          '~standard': {
            version: 1,
            vendor: 'test',
            validate: (value: unknown, options?: unknown) => {
              receivedOptions = options;
              return { value };
            },
          },
        };
        const optsPipe = new StandardSchemaValidationPipe({
          validateOptions: { strict: true, strip: 'extra' },
        });
        await optsPipe.transform({ name: 'test' }, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(receivedOptions).toEqual({ strict: true, strip: 'extra' });
      });

      it('should pass undefined when no validateOptions are provided', async () => {
        let receivedOptions: unknown = 'NOT_CALLED';
        const schema: StandardSchemaV1 = {
          '~standard': {
            version: 1,
            vendor: 'test',
            validate: (value: unknown, options?: unknown) => {
              receivedOptions = options;
              return { value };
            },
          },
        };
        await pipe.transform({ name: 'test' }, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(receivedOptions).toBeUndefined();
      });
    });

    describe('stripProtoKeys', () => {
      it('should remove __proto__ and prototype from value before validation', async () => {
        let receivedValue: any;
        const schema = createSchema(value => {
          receivedValue = value;
          return { value };
        });
        const malicious = JSON.parse(
          '{"name": "test", "__proto__": {"polluted": true}, "prototype": {"bad": true}}',
        );
        await pipe.transform(malicious, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(receivedValue).not.toHaveProperty('__proto__');
        expect(receivedValue).not.toHaveProperty('prototype');
        expect(receivedValue).toHaveProperty('name', 'test');
      });

      it('should strip proto keys recursively from nested objects', async () => {
        let receivedValue: any;
        const schema = createSchema(value => {
          receivedValue = value;
          return { value };
        });
        const malicious = {
          nested: JSON.parse('{"__proto__": {"polluted": true}, "ok": true}'),
        };
        await pipe.transform(malicious, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(receivedValue.nested).not.toHaveProperty('__proto__');
        expect(receivedValue.nested).toHaveProperty('ok', true);
      });

      it('should strip proto keys from arrays', async () => {
        let receivedValue: any;
        const schema = createSchema(value => {
          receivedValue = value;
          return { value };
        });
        const malicious = [
          JSON.parse('{"__proto__": {"polluted": true}, "ok": true}'),
        ];
        await pipe.transform(malicious, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(receivedValue[0]).not.toHaveProperty('__proto__');
        expect(receivedValue[0]).toHaveProperty('ok', true);
      });

      it('should not strip keys from built-in types', async () => {
        let receivedValue: any;
        const schema = createSchema(value => {
          receivedValue = value;
          return { value };
        });
        const date = new Date();
        await pipe.transform(date, {
          type: 'body',
          schema,
        } as ArgumentMetadata);
        expect(receivedValue).toBe(date);
      });
    });
  });
});
