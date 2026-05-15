import type { StandardSchemaV1 } from '@standard-schema/spec';
import { lastValueFrom, of } from 'rxjs';
import { StreamableFile } from '../../file-stream/index.js';
import { CallHandler, ExecutionContext } from '../../interfaces/index.js';
import { StandardSchemaSerializerInterceptor } from '../../serializer/standard-schema-serializer.interceptor.js';

function createSchema(
  validateFn: (
    value: unknown,
    options?: StandardSchemaV1.Options,
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

describe('StandardSchemaSerializerInterceptor', () => {
  let interceptor: StandardSchemaSerializerInterceptor;
  let mockReflector: any;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    };

    mockExecutionContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as any;

    mockCallHandler = {
      handle: vi.fn(),
    } as any;
  });

  describe('intercept', () => {
    describe('when no schema is provided', () => {
      it('should return the response unchanged', async () => {
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector);
        const response = { id: 1, name: 'Test' };
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of(response),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        const result = await lastValueFrom(result$);
        expect(result).toBe(response);
      });
    });

    describe('when schema is provided via default options', () => {
      it('should serialize the response through the schema', async () => {
        const schema = createSchema(value => ({
          value: { ...(value as any), serialized: true },
        }));
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
          schema,
        });
        const response = { id: 1, name: 'Test' };
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of(response),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        const result = await lastValueFrom(result$);
        expect(result).toEqual({ id: 1, name: 'Test', serialized: true });
      });
    });

    describe('when schema is provided via @SerializeOptions()', () => {
      it('should use the context schema over the default', async () => {
        const defaultSchema = createSchema(value => ({
          value: { ...(value as any), fromDefault: true },
        }));
        const contextSchema = createSchema(value => ({
          value: { ...(value as any), fromContext: true },
        }));
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
          schema: defaultSchema,
        });
        mockReflector.getAllAndOverride.mockReturnValue({
          schema: contextSchema,
        });
        const response = { id: 1 };
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of(response),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        const result = await lastValueFrom(result$);
        expect(result).toEqual({ id: 1, fromContext: true });
      });
    });

    describe('when response is an array', () => {
      it('should serialize each item through the schema', async () => {
        const schema = createSchema(value => ({
          value: { ...(value as any), serialized: true },
        }));
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
          schema,
        });
        const response = [{ id: 1 }, { id: 2 }];
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of(response),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        const result = await lastValueFrom(result$);
        expect(result).toEqual([
          { id: 1, serialized: true },
          { id: 2, serialized: true },
        ]);
      });
    });

    describe('when response is not an object', () => {
      it('should return primitive values unchanged', async () => {
        const schema = createSchema(() => ({
          issues: [{ message: 'should not be called' }],
        }));
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
          schema,
        });
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of('plain string'),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        const result = await lastValueFrom(result$);
        expect(result).toBe('plain string');
      });
    });

    describe('when response is a StreamableFile', () => {
      it('should return the streamable file unchanged', async () => {
        const schema = createSchema(() => ({
          issues: [{ message: 'should not be called' }],
        }));
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
          schema,
        });
        const file = new StreamableFile(Buffer.from('test'));
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of(file),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        const result = await lastValueFrom(result$);
        expect(result).toBe(file);
      });
    });

    describe('when schema validation fails', () => {
      it('should throw an error with issue messages', async () => {
        const schema = createSchema(() => ({
          issues: [
            { message: 'field is required' },
            { message: 'must be a number' },
          ],
        }));
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
          schema,
        });
        const response = { id: 1 };
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of(response),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        await expect(lastValueFrom(result$)).rejects.toThrow(
          'Serialization failed: field is required, must be a number',
        );
      });
    });

    describe('when async schema is used', () => {
      it('should resolve the async validation result', async () => {
        const schema = createSchema(async value => ({
          value: { ...(value as any), async: true },
        }));
        interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
          schema,
        });
        const response = { id: 1 };
        (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
          of(response),
        );

        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );
        const result = await lastValueFrom(result$);
        expect(result).toEqual({ id: 1, async: true });
      });
    });
  });

  describe('transformToPlain', () => {
    it('should return falsy values as-is', async () => {
      interceptor = new StandardSchemaSerializerInterceptor(mockReflector);
      const schema = createSchema(() => ({
        issues: [{ message: 'should not be called' }],
      }));
      expect(await interceptor.transformToPlain(null, schema)).toBeNull();
      expect(
        await interceptor.transformToPlain(undefined, schema),
      ).toBeUndefined();
      expect(await interceptor.transformToPlain(0, schema)).toBe(0);
      expect(await interceptor.transformToPlain('', schema)).toBe('');
    });
  });

  describe('validateOptions', () => {
    it('should forward default validateOptions to the schema', async () => {
      const validateSpy = vi.fn((_value, _options) => ({
        value: { ok: true },
      }));
      const schema = createSchema(validateSpy);
      const opts: StandardSchemaV1.Options = {
        libraryOptions: { strip: true },
      };
      interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
        schema,
        validateOptions: opts,
      });
      const response = { id: 1 };
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await lastValueFrom(result$);
      expect(validateSpy).toHaveBeenCalledWith(response, opts);
    });

    it('should forward context validateOptions from @SerializeOptions()', async () => {
      const validateSpy = vi.fn((_value, _options) => ({
        value: { ok: true },
      }));
      const schema = createSchema(validateSpy);
      const contextOpts: StandardSchemaV1.Options = {
        libraryOptions: { mode: 'strict' },
      };
      interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
        schema,
      });
      mockReflector.getAllAndOverride.mockReturnValue({
        validateOptions: contextOpts,
      });
      const response = { id: 1 };
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await lastValueFrom(result$);
      expect(validateSpy).toHaveBeenCalledWith(response, contextOpts);
    });

    it('should let context validateOptions override default', async () => {
      const validateSpy = vi.fn((_value, _options) => ({
        value: { ok: true },
      }));
      const schema = createSchema(validateSpy);
      const defaultOpts: StandardSchemaV1.Options = {
        libraryOptions: { from: 'default' },
      };
      const contextOpts: StandardSchemaV1.Options = {
        libraryOptions: { from: 'context' },
      };
      interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
        schema,
        validateOptions: defaultOpts,
      });
      mockReflector.getAllAndOverride.mockReturnValue({
        validateOptions: contextOpts,
      });
      const response = { id: 1 };
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await lastValueFrom(result$);
      expect(validateSpy).toHaveBeenCalledWith(response, contextOpts);
    });

    it('should pass undefined when no validateOptions are set', async () => {
      const validateSpy = vi.fn((_value, _options) => ({
        value: { ok: true },
      }));
      const schema = createSchema(validateSpy);
      interceptor = new StandardSchemaSerializerInterceptor(mockReflector, {
        schema,
      });
      const response = { id: 1 };
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await lastValueFrom(result$);
      expect(validateSpy).toHaveBeenCalledWith(response, undefined);
    });
  });
});
