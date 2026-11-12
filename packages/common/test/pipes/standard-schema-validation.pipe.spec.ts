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
            message: ['name: field is required', 'must be a string'],
            error: 'Bad Request',
          });
        }
      });

      it('should prefix nested paths in issue messages', async () => {
        const schema = createSchema(() => ({
          issues: [
            {
              message: 'Invalid input: expected string, received boolean',
              path: ['address', 'line1'],
            },
          ],
        }));

        try {
          await pipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect((error as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: [
              'address.line1: Invalid input: expected string, received boolean',
            ],
            error: 'Bad Request',
          });
        }
      });

      it('should handle object path segments with a key property', async () => {
        expect.assertions(1);
        const schema = createSchema(() => ({
          issues: [
            {
              message: 'Invalid input: expected string, received number',
              path: [{ key: 'address' }, { key: 'line1' }],
            },
          ],
        }));

        try {
          await pipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect((error as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: [
              'address.line1: Invalid input: expected string, received number',
            ],
            error: 'Bad Request',
          });
        }
      });

      it('should handle mixed string and object path segments', async () => {
        expect.assertions(1);
        const schema = createSchema(() => ({
          issues: [
            {
              message: 'must be a positive number',
              path: ['items', { key: 0 }, 'price'],
            },
          ],
        }));

        try {
          await pipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect((error as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: ['items.0.price: must be a positive number'],
            error: 'Bad Request',
          });
        }
      });

      it('should stringify number and symbol path segments', async () => {
        expect.assertions(2);
        const schema = createSchema(() => ({
          issues: [
            {
              message: 'must be a positive number',
              path: ['items', 0, 'price'],
            },
            {
              message: 'must be a string',
              path: [Symbol('meta'), { key: Symbol('label') }],
            },
          ],
        }));

        try {
          await pipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: [
              'items.0.price: must be a positive number',
              'Symbol(meta).Symbol(label): must be a string',
            ],
            error: 'Bad Request',
          });
        }
      });

      it('should not prefix the message when the path is empty', async () => {
        expect.assertions(1);
        const schema = createSchema(() => ({
          issues: [{ message: 'invalid value', path: [] }],
        }));

        try {
          await pipe.transform({}, {
            type: 'body',
            schema,
          } as ArgumentMetadata);
        } catch (error) {
          expect((error as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: ['invalid value'],
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

    describe('option: "maxErrorMessagesLength"', () => {
      const omitted = 'Further validation errors were omitted';
      const issues = [
        { message: 'must be a string', path: ['a'] },
        { message: 'must be a string', path: ['b', { key: 'c' }] },
        { message: 'must be a string', path: ['b', 'd'] },
      ];
      const messagesOf = async (
        target: StandardSchemaValidationPipe,
        schemaIssues: readonly StandardSchemaV1.Issue[],
      ): Promise<string[]> => {
        const error: HttpException = await target
          .transform({}, {
            type: 'body',
            schema: createSchema(() => ({ issues: schemaIssues })),
          } as ArgumentMetadata)
          .catch(err => err);
        expect(error).toBeInstanceOf(HttpException);
        return (error.getResponse() as { message: string[] }).message;
      };

      it('should use the default limit for a value that is not a number', () => {
        const target = new StandardSchemaValidationPipe({
          maxErrorMessagesLength: NaN,
        });

        expect(target['maxErrorMessagesLength']).toBe(1_000_000);
      });

      it('should leave out the messages past the limit and say so', async () => {
        const target = new StandardSchemaValidationPipe({
          maxErrorMessagesLength: 30,
        });

        expect(await messagesOf(target, issues)).toEqual([
          'a: must be a string',
          'b.c: must be a string',
          omitted,
        ]);
      });

      it('should not format the issues past the limit', async () => {
        const target = new StandardSchemaValidationPipe({
          maxErrorMessagesLength: 50,
        });
        let read = 0;
        const paths = Array.from({ length: 1_000 }, (_, index) => ({
          get key() {
            read++;
            return index;
          },
        }));

        const messages = await messagesOf(
          target,
          paths.map(segment => ({
            message: 'must be a string',
            path: ['items', segment],
          })),
        );

        expect(messages.at(-1)).toBe(omitted);
        expect(read).toBeLessThan(10);
      });

      it('should limit the messages to about a million characters by default', async () => {
        const manyIssues = Array.from({ length: 100_000 }, (_, index) => ({
          message: 'Invalid input: expected string, received undefined',
          path: ['contacts', index, 'name'],
        }));

        const messages = await messagesOf(pipe, manyIssues);

        expect(messages.at(-1)).toBe(omitted);
        // about 7 million characters in full
        expect(messages.join('').length).toBeLessThan(1_000_100);
      });

      it('should keep every message when the limit is lifted', async () => {
        const target = new StandardSchemaValidationPipe({
          maxErrorMessagesLength: Infinity,
        });

        expect(await messagesOf(target, issues)).toEqual([
          'a: must be a string',
          'b.c: must be a string',
          'b.d: must be a string',
        ]);
      });

      it('should hand every issue to a custom exception factory', async () => {
        const exceptionFactory = vi.fn(() => new Error('custom'));
        const target = new StandardSchemaValidationPipe({
          maxErrorMessagesLength: 10,
          exceptionFactory,
        });

        await expect(
          target.transform({}, {
            type: 'body',
            schema: createSchema(() => ({ issues })),
          } as ArgumentMetadata),
        ).rejects.toThrow('custom');
        expect(exceptionFactory).toHaveBeenCalledWith(issues);
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

  describe('subclass compatibility', () => {
    it('should allow subclasses to call super.stripProtoKeys', () => {
      class CustomPipe extends StandardSchemaValidationPipe {
        public callSuperStripProtoKeys(value: any) {
          super.stripProtoKeys(value);
        }
      }
      const customPipe = new CustomPipe();
      const value = { constructor: 'malicious' };
      expect(() => customPipe.callSuperStripProtoKeys(value)).not.toThrow();
      expect(value).not.toHaveProperty('constructor');
    });

    it('should invoke an overridden stripProtoKeys during transform', async () => {
      let called = false;
      class CustomPipe extends StandardSchemaValidationPipe {
        protected override stripProtoKeys(value: any) {
          called = true;
          super.stripProtoKeys(value);
        }
      }
      const customPipe = new CustomPipe();
      const schema = createSchema(value => ({ value }));
      await customPipe.transform({ name: 'test' }, {
        type: 'body',
        schema,
      } as ArgumentMetadata);
      expect(called).toBe(true);
    });
  });
});
