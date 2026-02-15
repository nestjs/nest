import { of } from 'rxjs';
import { StreamableFile } from '../../file-stream/index.js';
import { CallHandler, ExecutionContext } from '../../interfaces/index.js';
import { ClassSerializerInterceptor } from '../../serializer/class-serializer.interceptor.js';

describe('ClassSerializerInterceptor', () => {
  let interceptor: ClassSerializerInterceptor;
  let mockReflector: any;
  let mockTransformerPackage: any;
  let sandbox: any;

  beforeEach(() => {
    sandbox = /* sandbox not needed with vitest */ { stub: vi.fn };
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    mockTransformerPackage = {
      classToPlain: vi.fn(),
      plainToInstance: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create interceptor with default transformer package', () => {
      // This would normally load 'class-transformer' package
      // For testing, we pass a mock transformer package
      const options = {
        transformerPackage: mockTransformerPackage,
      };

      interceptor = new ClassSerializerInterceptor(mockReflector, options);

      expect(interceptor).toBeInstanceOf(ClassSerializerInterceptor);
    });

    it('should use provided transformer package from options', () => {
      const customTransformer = {
        classToPlain: vi.fn(),
        plainToInstance: vi.fn(),
      };

      const options = {
        transformerPackage: customTransformer,
      };

      interceptor = new ClassSerializerInterceptor(mockReflector, options);

      expect(interceptor).toBeInstanceOf(ClassSerializerInterceptor);
    });
  });

  describe('intercept', () => {
    let mockExecutionContext: ExecutionContext;
    let mockCallHandler: CallHandler;

    beforeEach(() => {
      interceptor = new ClassSerializerInterceptor(mockReflector, {
        transformerPackage: mockTransformerPackage,
      });

      mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      mockCallHandler = {
        handle: vi.fn(),
      } as any;
    });

    it('should transform plain object response', async () => {
      const response = { id: 1, name: 'Test' };
      const transformedResponse = { id: 1, name: 'Test' };

      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      mockTransformerPackage.classToPlain.mockReturnValue(transformedResponse);
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(result => {
          expect(result).toBe(transformedResponse);
          resolve();
        });
      });
    });

    it('should transform array of objects', async () => {
      const response = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' },
      ];
      const transformedItem1 = { id: 1, name: 'Test1' };
      const transformedItem2 = { id: 2, name: 'Test2' };

      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      mockTransformerPackage.classToPlain
        .mockReturnValueOnce(transformedItem1)
        .mockReturnValueOnce(transformedItem2);
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(result => {
          expect(result).toHaveLength(2);
          expect(result[0]).toBe(transformedItem1);
          expect(result[1]).toBe(transformedItem2);
          resolve();
        });
      });
    });

    it('should merge context options with default options', async () => {
      const response = { id: 1, name: 'Test' };
      const defaultOptions = { excludeExtraneousValues: true };
      const contextOptions = { groups: ['user'] };
      const transformedResponse = { id: 1 };

      interceptor = new ClassSerializerInterceptor(mockReflector, {
        transformerPackage: mockTransformerPackage,
        ...defaultOptions,
      });

      mockReflector.getAllAndOverride.mockReturnValue(contextOptions);
      mockTransformerPackage.classToPlain.mockReturnValue(transformedResponse);
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(result => {
          const callArgs = mockTransformerPackage.classToPlain.mock.calls[0];
          expect(callArgs[1]).toMatchObject(defaultOptions);
          expect(callArgs[1]).toMatchObject(contextOptions);
          resolve();
        });
      });
    });

    it('should call reflector with handler and class', async () => {
      const response = { id: 1 };
      const mockHandler = {};
      const mockClass = {};

      (
        mockExecutionContext.getHandler as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockHandler);
      (
        mockExecutionContext.getClass as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockClass);
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      mockTransformerPackage.classToPlain.mockReturnValue(response);
      (mockCallHandler.handle as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(() => {
          expect(mockReflector.getAllAndOverride).toHaveBeenCalledOnce();
          const args = mockReflector.getAllAndOverride.mock.calls[0];
          expect(args[1]).toEqual([mockHandler, mockClass]);
          resolve();
        });
      });
    });
  });

  describe('serialize', () => {
    beforeEach(() => {
      interceptor = new ClassSerializerInterceptor(mockReflector, {
        transformerPackage: mockTransformerPackage,
      });
    });

    it('should return primitive values unchanged', () => {
      expect(interceptor.serialize('string' as any, {})).toBe('string');
      expect(interceptor.serialize(123 as any, {})).toBe(123);
      expect(interceptor.serialize(true as any, {})).toBe(true);
    });

    it('should return null unchanged', () => {
      expect(interceptor.serialize(null as any, {})).toBeNull();
    });

    it('should return undefined unchanged', () => {
      expect(interceptor.serialize(undefined as any, {})).toBeUndefined();
    });

    it('should return StreamableFile unchanged', () => {
      const streamableFile = new StreamableFile(Buffer.from('test'));
      const result = interceptor.serialize(streamableFile as any, {});

      expect(result).toBe(streamableFile);
      expect(mockTransformerPackage.classToPlain).not.toHaveBeenCalled();
    });

    it('should transform plain object', () => {
      const input = { id: 1, name: 'Test' };
      const output = { id: 1 };

      mockTransformerPackage.classToPlain.mockReturnValue(output);

      const result = interceptor.serialize(input, {});

      expect(result).toBe(output);
      expect(mockTransformerPackage.classToPlain).toHaveBeenCalledOnce();
    });

    it('should transform array of objects', () => {
      const input = [{ id: 1 }, { id: 2 }];
      const output1 = { id: 1 };
      const output2 = { id: 2 };

      mockTransformerPackage.classToPlain
        .mockReturnValueOnce(output1)
        .mockReturnValueOnce(output2);

      const result = interceptor.serialize(input, {});

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(output1);
      expect(result[1]).toBe(output2);
      expect(mockTransformerPackage.classToPlain).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', () => {
      const input: any[] = [];

      const result = interceptor.serialize(input, {});

      expect(result).toHaveLength(0);
      expect(mockTransformerPackage.classToPlain).not.toHaveBeenCalled();
    });
  });

  describe('transformToPlain', () => {
    beforeEach(() => {
      interceptor = new ClassSerializerInterceptor(mockReflector, {
        transformerPackage: mockTransformerPackage,
      });
    });

    it('should return falsy values unchanged', () => {
      expect(interceptor.transformToPlain(null, {})).toBeNull();
      expect(interceptor.transformToPlain(undefined, {})).toBeUndefined();
      expect(interceptor.transformToPlain(0 as any, {})).toBe(0);
      expect(interceptor.transformToPlain(false as any, {})).toBe(false);
      expect(interceptor.transformToPlain('' as any, {})).toBe('');
    });

    it('should use classToPlain when no type option provided', () => {
      const input = { id: 1, name: 'Test' };
      const output = { id: 1 };

      mockTransformerPackage.classToPlain.mockReturnValue(output);

      const result = interceptor.transformToPlain(input, {});

      expect(result).toBe(output);
      expect(mockTransformerPackage.classToPlain).toHaveBeenCalledWith(
        input,
        {},
      );
      expect(mockTransformerPackage.plainToInstance).not.toHaveBeenCalled();
    });

    it('should use classToPlain when input is instance of options.type', () => {
      class UserDto {
        id: number;
        name: string;
      }

      const input = new UserDto();
      input.id = 1;
      input.name = 'Test';

      const output = { id: 1 };
      const options = { type: UserDto };

      mockTransformerPackage.classToPlain.mockReturnValue(output);

      const result = interceptor.transformToPlain(input, options);

      expect(result).toBe(output);
      expect(mockTransformerPackage.classToPlain).toHaveBeenCalledOnce();
      expect(mockTransformerPackage.plainToInstance).not.toHaveBeenCalled();
    });

    it('should convert plain to instance then to plain when type provided but not matching', () => {
      class UserDto {
        id: number;
      }

      const plainInput = { id: 1, name: 'Test', password: 'secret' };
      const instanceOutput = new UserDto();
      instanceOutput.id = 1;

      const finalOutput = { id: 1 };
      const options = { type: UserDto };

      mockTransformerPackage.plainToInstance.mockReturnValue(instanceOutput);
      mockTransformerPackage.classToPlain.mockReturnValue(finalOutput);

      const result = interceptor.transformToPlain(plainInput, options);

      expect(result).toBe(finalOutput);
      expect(mockTransformerPackage.plainToInstance).toHaveBeenCalledWith(
        UserDto,
        plainInput,
        options,
      );
      expect(mockTransformerPackage.classToPlain).toHaveBeenCalledWith(
        instanceOutput,
        options,
      );
    });

    it('should handle complex nested objects', () => {
      const input = {
        user: { id: 1, name: 'Test' },
        posts: [{ id: 1, title: 'Post 1' }],
      };
      const output = {
        user: { id: 1 },
        posts: [{ id: 1 }],
      };

      mockTransformerPackage.classToPlain.mockReturnValue(output);

      const result = interceptor.transformToPlain(input, {});

      expect(result).toBe(output);
    });
  });

  describe('getContextOptions', () => {
    beforeEach(() => {
      interceptor = new ClassSerializerInterceptor(mockReflector, {
        transformerPackage: mockTransformerPackage,
      });
    });

    it('should call reflector getAllAndOverride with correct arguments', () => {
      const mockHandler = {};
      const mockClass = {};
      const mockContext = {
        getHandler: vi.fn().mockReturnValue(mockHandler),
        getClass: vi.fn().mockReturnValue(mockClass),
      } as any;

      const expectedOptions = { groups: ['admin'] };
      mockReflector.getAllAndOverride.mockReturnValue(expectedOptions);

      const result = (interceptor as any).getContextOptions(mockContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledOnce();
      const callArgs = mockReflector.getAllAndOverride.mock.calls[0];
      expect(callArgs[1]).toEqual([mockHandler, mockClass]);
      expect(result).toBe(expectedOptions);
    });

    it('should return undefined when no metadata exists', () => {
      const mockContext = {
        getHandler: vi.fn().mockReturnValue({}),
        getClass: vi.fn().mockReturnValue({}),
      } as any;

      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = (interceptor as any).getContextOptions(mockContext);

      expect(result).toBeUndefined();
    });

    it('should respect handler metadata over class metadata', () => {
      const mockHandler = {};
      const mockClass = {};
      const mockContext = {
        getHandler: vi.fn().mockReturnValue(mockHandler),
        getClass: vi.fn().mockReturnValue(mockClass),
      } as any;

      // getAllAndOverride should merge with handler taking precedence
      const handlerOptions = {
        groups: ['user'],
        excludeExtraneousValues: true,
      };
      mockReflector.getAllAndOverride.mockReturnValue(handlerOptions);

      const result = (interceptor as any).getContextOptions(mockContext);

      expect(result).toEqual(handlerOptions);
      // Verify it's checking handler first, then class
      const callArgs = mockReflector.getAllAndOverride.mock.calls[0];
      expect(callArgs[1][0]).toBe(mockHandler);
      expect(callArgs[1][1]).toBe(mockClass);
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      interceptor = new ClassSerializerInterceptor(mockReflector, {
        transformerPackage: mockTransformerPackage,
      });
    });

    it('should handle array with mixed types', () => {
      const input = [
        { id: 1, name: 'Test' },
        null,
        undefined,
        { id: 2, name: 'Test2' },
      ];

      mockTransformerPackage.classToPlain
        .mockReturnValueOnce({ id: 1, name: 'Test' })
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ id: 2, name: 'Test2' });

      const result = interceptor.serialize(input, {});

      expect(result).toHaveLength(4);
      expect(result[1]).toBeNull();
      expect(result[2]).toBeUndefined();
    });

    it('should not transform when response is not an object', () => {
      const input = 'plain string';

      const result = interceptor.serialize(input as any, {});

      expect(result).toBe(input);
      expect(mockTransformerPackage.classToPlain).not.toHaveBeenCalled();
    });

    it('should handle Date objects', () => {
      const date = new Date();
      const output = { date: date.toISOString() };

      mockTransformerPackage.classToPlain.mockReturnValue(output);

      const result = interceptor.serialize({ date } as any, {});

      expect(mockTransformerPackage.classToPlain).toHaveBeenCalledOnce();
    });

    it('should pass through options to transformer', () => {
      const input = { id: 1, name: 'Test', password: 'secret' };
      const options = {
        excludeExtraneousValues: true,
        groups: ['public'],
        strategy: 'excludeAll',
      };

      mockTransformerPackage.classToPlain.mockReturnValue({
        id: 1,
        name: 'Test',
      });

      interceptor.transformToPlain(input, options as any);

      expect(mockTransformerPackage.classToPlain).toHaveBeenCalledOnce();
      const callArgs = mockTransformerPackage.classToPlain.mock.calls[0];
      expect(callArgs[1]).toMatchObject(options);
    });
  });
});
