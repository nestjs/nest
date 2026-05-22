import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Scope,
} from '@nestjs/common';
import { REQUEST, createContextId } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

describe('Parallel request-scoped resolution', () => {
  const ASYNC_REQUEST_SCOPED = 'ASYNC_REQUEST_SCOPED';
  const SAME_CONTEXT_REQUEST_SCOPED = 'SAME_CONTEXT_REQUEST_SCOPED';
  const OVERLAP_REQUEST_COUNT = 1000;

  @Injectable()
  class ResolveInflightGate {
    private arrivalCount = 0;
    private released = false;
    private waitingResolver?: () => void;

    async waitForOverlap() {
      if (this.released) {
        return;
      }

      this.arrivalCount++;
      if (this.arrivalCount === 1) {
        await new Promise<void>(resolve => {
          this.waitingResolver = resolve;
        });
        return;
      }

      this.released = true;
      this.waitingResolver?.();
      this.waitingResolver = undefined;
    }

    async yieldOneTurn() {
      await new Promise<void>(resolve => setImmediate(resolve));
    }
  }

  @Injectable({ scope: Scope.REQUEST })
  class RequestReader {
    constructor(
      @Inject(REQUEST)
      public readonly request: {
        requestId: string;
      },
    ) {}
  }

  const AsyncRequestScopedProvider = {
    provide: ASYNC_REQUEST_SCOPED,
    scope: Scope.REQUEST,
    inject: [RequestReader, ResolveInflightGate],
    useFactory: async (
      requestReader: RequestReader,
      inflightGate: ResolveInflightGate,
    ) => {
      await inflightGate.waitForOverlap();

      return {
        requestId: requestReader.request.requestId,
      };
    },
  };

  const SameContextRequestScopedProvider = {
    provide: SAME_CONTEXT_REQUEST_SCOPED,
    scope: Scope.REQUEST,
    inject: [RequestReader, ResolveInflightGate],
    useFactory: async (
      requestReader: RequestReader,
      inflightGate: ResolveInflightGate,
    ) => {
      await inflightGate.yieldOneTurn();

      return {
        requestId: requestReader.request.requestId,
      };
    },
  };

  @Injectable()
  class BubbledProvider {
    constructor(
      @Inject(ASYNC_REQUEST_SCOPED)
      public readonly payload: {
        requestId: string;
      },
      public readonly requestReader: RequestReader,
    ) {}
  }

  @Injectable()
  class SameContextBubbledProvider {
    constructor(
      @Inject(SAME_CONTEXT_REQUEST_SCOPED)
      public readonly payload: {
        requestId: string;
      },
      public readonly requestReader: RequestReader,
    ) {}
  }

  @Controller({ path: 'parallel', scope: Scope.REQUEST })
  class ParallelController {
    constructor(
      @Inject(ASYNC_REQUEST_SCOPED)
      public readonly payload: {
        requestId: string;
      },
      public readonly requestReader: RequestReader,
    ) {}

    @Get()
    getPayload() {
      return this.payload;
    }
  }

  @Module({
    controllers: [ParallelController],
    providers: [
      ResolveInflightGate,
      RequestReader,
      AsyncRequestScopedProvider,
      SameContextRequestScopedProvider,
      BubbledProvider,
      SameContextBubbledProvider,
    ],
  })
  class ParallelModule {}

  let testingModule: TestingModule;

  const prepareContexts = (moduleRef: TestingModule, count: number) =>
    Array.from({ length: count }, (_, index) => {
      const contextId = createContextId();
      const request = { requestId: `request-${index}` };
      moduleRef.registerRequestByContextId(request, contextId);
      return { contextId, request };
    });

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [ParallelModule],
    }).compile();
  });

  it('should isolate request-scoped factory providers across overlapping context resolutions', async () => {
    const contexts = prepareContexts(testingModule, OVERLAP_REQUEST_COUNT);

    const payloads = await Promise.all(
      contexts.map(({ contextId }) =>
        testingModule.resolve<{ requestId: string }>(
          ASYNC_REQUEST_SCOPED,
          contextId,
        ),
      ),
    );

    expect(payloads).toEqual(
      contexts.map(({ request }) => ({ requestId: request.requestId })),
    );
    expect(new Set(payloads).size).toBe(contexts.length);
  }, 20000);

  it('should bubble singleton providers to request scope during overlapping context resolutions', async () => {
    const contexts = prepareContexts(testingModule, OVERLAP_REQUEST_COUNT);

    const providers = await Promise.all(
      contexts.map(({ contextId }) =>
        testingModule.resolve(BubbledProvider, contextId),
      ),
    );

    expect(new Set(providers).size).toBe(contexts.length);
    expect(providers.map(provider => provider.payload)).toEqual(
      contexts.map(({ request }) => ({ requestId: request.requestId })),
    );
    expect(
      providers.map(provider => provider.requestReader.request.requestId),
    ).toEqual(contexts.map(({ request }) => request.requestId));
  }, 20000);

  it('should reuse a request-scoped factory provider for overlapping resolutions in the same context', async () => {
    const [{ contextId, request }] = prepareContexts(testingModule, 1);

    const providers = await Promise.all(
      Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
        testingModule.resolve<{ requestId: string }>(
          SAME_CONTEXT_REQUEST_SCOPED,
          contextId,
        ),
      ),
    );

    expect(new Set(providers).size).toBe(1);
    expect(providers[0]).toEqual({ requestId: request.requestId });
  }, 20000);

  it('should reuse a bubbled provider for overlapping resolutions in the same context', async () => {
    const [{ contextId, request }] = prepareContexts(testingModule, 1);

    const providers = await Promise.all(
      Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
        testingModule.resolve(SameContextBubbledProvider, contextId),
      ),
    );

    expect(new Set(providers).size).toBe(1);
    expect(providers[0].payload).toEqual({
      requestId: request.requestId,
    });
    expect(providers[0].requestReader.request).toBe(request);
  }, 20000);

  it('should isolate request-scoped controllers during overlapping context resolutions', async () => {
    const contexts = prepareContexts(testingModule, OVERLAP_REQUEST_COUNT);

    const controllers = await Promise.all(
      contexts.map(({ contextId }) =>
        testingModule.resolve(ParallelController, contextId),
      ),
    );

    expect(new Set(controllers).size).toBe(contexts.length);
    expect(controllers.map(controller => controller.payload)).toEqual(
      contexts.map(({ request }) => ({ requestId: request.requestId })),
    );
    expect(
      controllers.map(controller => controller.requestReader.request.requestId),
    ).toEqual(contexts.map(({ request }) => request.requestId));
  }, 20000);
});
