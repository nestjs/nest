import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { StreamableFile } from '../../file-stream/index.js';
import { CallHandler, ExecutionContext } from '../../interfaces/index.js';
import { ClassSerializerInterceptor } from '../../serializer/class-serializer.interceptor.js';

describe('ClassSerializerInterceptor', () => {
  let interceptor: ClassSerializerInterceptor;
  let mockReflector: any;
  let mockTransformerPackage: any;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockReflector = {
      getAllAndOverride: sandbox.stub(),
    };
    mockTransformerPackage = {
      classToPlain: sandbox.stub(),
      plainToInstance: sandbox.stub(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should create interceptor with default transformer package', () => {
      // This would normally load 'class-transformer' package
      // For testing, we pass a mock transformer package
      const options = {
        transformerPackage: mockTransformerPackage,
      };

      interceptor = new ClassSerializerInterceptor(mockReflector, options);

      expect(interceptor).to.be.instanceOf(ClassSerializerInterceptor);
    });

    it('should use provided transformer package from options', () => {
      const customTransformer = {
        classToPlain: sandbox.stub(),
        plainToInstance: sandbox.stub(),
      };

      const options = {
        transformerPackage: customTransformer,
      };

      interceptor = new ClassSerializerInterceptor(mockReflector, options);

      expect(interceptor).to.be.instanceOf(ClassSerializerInterceptor);
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
        getHandler: sandbox.stub(),
        getClass: sandbox.stub(),
      } as any;

      mockCallHandler = {
        handle: sandbox.stub(),
      } as any;
    });

    it('should transform plain object response', async () => {
      const response = { id: 1, name: 'Test' };
      const transformedResponse = { id: 1, name: 'Test' };

      mockReflector.getAllAndOverride.returns(undefined);
      mockTransformerPackage.classToPlain.returns(transformedResponse);
      (mockCallHandler.handle as sinon.SinonStub).returns(of(response));

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(result => {
          expect(result).to.equal(transformedResponse);
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

      mockReflector.getAllAndOverride.returns(undefined);
      mockTransformerPackage.classToPlain
        .onFirstCall()
        .returns(transformedItem1);
      mockTransformerPackage.classToPlain
        .onSecondCall()
        .returns(transformedItem2);
      (mockCallHandler.handle as sinon.SinonStub).returns(of(response));

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(result => {
          expect(result).to.be.an('array').with.lengthOf(2);
          expect(result[0]).to.equal(transformedItem1);
          expect(result[1]).to.equal(transformedItem2);
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

      mockReflector.getAllAndOverride.returns(contextOptions);
      mockTransformerPackage.classToPlain.returns(transformedResponse);
      (mockCallHandler.handle as sinon.SinonStub).returns(of(response));

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(result => {
          const callArgs = mockTransformerPackage.classToPlain.getCall(0).args;
          expect(callArgs[1]).to.deep.include(defaultOptions);
          expect(callArgs[1]).to.deep.include(contextOptions);
          resolve();
        });
      });
    });

    it('should call reflector with handler and class', async () => {
      const response = { id: 1 };
      const mockHandler = {};
      const mockClass = {};

      (mockExecutionContext.getHandler as sinon.SinonStub).returns(mockHandler);
      (mockExecutionContext.getClass as sinon.SinonStub).returns(mockClass);
      mockReflector.getAllAndOverride.returns(undefined);
      mockTransformerPackage.classToPlain.returns(response);
      (mockCallHandler.handle as sinon.SinonStub).returns(of(response));

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await new Promise<void>(resolve => {
        result$.subscribe(() => {
          expect(mockReflector.getAllAndOverride.calledOnce).to.be.true;
          const args = mockReflector.getAllAndOverride.getCall(0).args;
          expect(args[1]).to.deep.equal([mockHandler, mockClass]);
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
      expect(interceptor.serialize('string' as any, {})).to.equal('string');
      expect(interceptor.serialize(123 as any, {})).to.equal(123);
      expect(interceptor.serialize(true as any, {})).to.equal(true);
    });

    it('should return null unchanged', () => {
      expect(interceptor.serialize(null as any, {})).to.be.null;
    });

    it('should return undefined unchanged', () => {
      expect(interceptor.serialize(undefined as any, {})).to.be.undefined;
    });

    it('should return StreamableFile unchanged', () => {
      const streamableFile = new StreamableFile(Buffer.from('test'));
      const result = interceptor.serialize(streamableFile as any, {});

      expect(result).to.equal(streamableFile);
      expect(mockTransformerPackage.classToPlain.called).to.be.false;
    });

    it('should transform plain object', () => {
      const input = { id: 1, name: 'Test' };
      const output = { id: 1 };

      mockTransformerPackage.classToPlain.returns(output);

      const result = interceptor.serialize(input, {});

      expect(result).to.equal(output);
      expect(mockTransformerPackage.classToPlain.calledOnce).to.be.true;
    });

    it('should transform array of objects', () => {
      const input = [{ id: 1 }, { id: 2 }];
      const output1 = { id: 1 };
      const output2 = { id: 2 };

      mockTransformerPackage.classToPlain.onFirstCall().returns(output1);
      mockTransformerPackage.classToPlain.onSecondCall().returns(output2);

      const result = interceptor.serialize(input, {});

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0]).to.equal(output1);
      expect(result[1]).to.equal(output2);
      expect(mockTransformerPackage.classToPlain.calledTwice).to.be.true;
    });

    it('should handle empty array', () => {
      const input: any[] = [];

      const result = interceptor.serialize(input, {});

      expect(result).to.be.an('array').that.is.empty;
      expect(mockTransformerPackage.classToPlain.called).to.be.false;
    });
  });

  describe('transformToPlain', () => {
    beforeEach(() => {
      interceptor = new ClassSerializerInterceptor(mockReflector, {
        transformerPackage: mockTransformerPackage,
      });
    });

    it('should return falsy values unchanged', () => {
      expect(interceptor.transformToPlain(null, {})).to.be.null;
      expect(interceptor.transformToPlain(undefined, {})).to.be.undefined;
      expect(interceptor.transformToPlain(0 as any, {})).to.equal(0);
      expect(interceptor.transformToPlain(false as any, {})).to.be.false;
      expect(interceptor.transformToPlain('' as any, {})).to.equal('');
    });

    it('should use classToPlain when no type option provided', () => {
      const input = { id: 1, name: 'Test' };
      const output = { id: 1 };

      mockTransformerPackage.classToPlain.returns(output);

      const result = interceptor.transformToPlain(input, {});

      expect(result).to.equal(output);
      expect(mockTransformerPackage.classToPlain.calledOnceWith(input, {})).to
        .be.true;
      expect(mockTransformerPackage.plainToInstance.called).to.be.false;
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

      mockTransformerPackage.classToPlain.returns(output);

      const result = interceptor.transformToPlain(input, options);

      expect(result).to.equal(output);
      expect(mockTransformerPackage.classToPlain.calledOnce).to.be.true;
      expect(mockTransformerPackage.plainToInstance.called).to.be.false;
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

      mockTransformerPackage.plainToInstance.returns(instanceOutput);
      mockTransformerPackage.classToPlain.returns(finalOutput);

      const result = interceptor.transformToPlain(plainInput, options);

      expect(result).to.equal(finalOutput);
      expect(
        mockTransformerPackage.plainToInstance.calledOnceWith(
          UserDto,
          plainInput,
          options,
        ),
      ).to.be.true;
      expect(
        mockTransformerPackage.classToPlain.calledOnceWith(
          instanceOutput,
          options,
        ),
      ).to.be.true;
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

      mockTransformerPackage.classToPlain.returns(output);

      const result = interceptor.transformToPlain(input, {});

      expect(result).to.equal(output);
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
        getHandler: sandbox.stub().returns(mockHandler),
        getClass: sandbox.stub().returns(mockClass),
      } as any;

      const expectedOptions = { groups: ['admin'] };
      mockReflector.getAllAndOverride.returns(expectedOptions);

      const result = (interceptor as any).getContextOptions(mockContext);

      expect(mockReflector.getAllAndOverride.calledOnce).to.be.true;
      const callArgs = mockReflector.getAllAndOverride.getCall(0).args;
      expect(callArgs[1]).to.deep.equal([mockHandler, mockClass]);
      expect(result).to.equal(expectedOptions);
    });

    it('should return undefined when no metadata exists', () => {
      const mockContext = {
        getHandler: sandbox.stub().returns({}),
        getClass: sandbox.stub().returns({}),
      } as any;

      mockReflector.getAllAndOverride.returns(undefined);

      const result = (interceptor as any).getContextOptions(mockContext);

      expect(result).to.be.undefined;
    });

    it('should respect handler metadata over class metadata', () => {
      const mockHandler = {};
      const mockClass = {};
      const mockContext = {
        getHandler: sandbox.stub().returns(mockHandler),
        getClass: sandbox.stub().returns(mockClass),
      } as any;

      // getAllAndOverride should merge with handler taking precedence
      const handlerOptions = {
        groups: ['user'],
        excludeExtraneousValues: true,
      };
      mockReflector.getAllAndOverride.returns(handlerOptions);

      const result = (interceptor as any).getContextOptions(mockContext);

      expect(result).to.deep.equal(handlerOptions);
      // Verify it's checking handler first, then class
      const callArgs = mockReflector.getAllAndOverride.getCall(0).args;
      expect(callArgs[1][0]).to.equal(mockHandler);
      expect(callArgs[1][1]).to.equal(mockClass);
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
        .onCall(0)
        .returns({ id: 1, name: 'Test' });
      mockTransformerPackage.classToPlain.onCall(1).returns(null);
      mockTransformerPackage.classToPlain.onCall(2).returns(undefined);
      mockTransformerPackage.classToPlain
        .onCall(3)
        .returns({ id: 2, name: 'Test2' });

      const result = interceptor.serialize(input, {});

      expect(result).to.be.an('array').with.lengthOf(4);
      expect(result[1]).to.be.null;
      expect(result[2]).to.be.undefined;
    });

    it('should not transform when response is not an object', () => {
      const input = 'plain string';

      const result = interceptor.serialize(input as any, {});

      expect(result).to.equal(input);
      expect(mockTransformerPackage.classToPlain.called).to.be.false;
    });

    it('should handle Date objects', () => {
      const date = new Date();
      const output = { date: date.toISOString() };

      mockTransformerPackage.classToPlain.returns(output);

      const result = interceptor.serialize({ date } as any, {});

      expect(mockTransformerPackage.classToPlain.calledOnce).to.be.true;
    });

    it('should pass through options to transformer', () => {
      const input = { id: 1, name: 'Test', password: 'secret' };
      const options = {
        excludeExtraneousValues: true,
        groups: ['public'],
        strategy: 'excludeAll',
      };

      mockTransformerPackage.classToPlain.returns({ id: 1, name: 'Test' });

      interceptor.transformToPlain(input, options as any);

      expect(mockTransformerPackage.classToPlain.calledOnce).to.be.true;
      const callArgs = mockTransformerPackage.classToPlain.getCall(0).args;
      expect(callArgs[1]).to.deep.include(options);
    });
  });
});
