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
import { expect } from 'chai';

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

  it('should isolate request-scoped factory providers across overlapping context resolutions', async function () {
    this.timeout(20000);
    const contexts = prepareContexts(testingModule, OVERLAP_REQUEST_COUNT);

    const payloads = await Promise.all(
      contexts.map(({ contextId }) =>
        testingModule.resolve<{ requestId: string }>(
          ASYNC_REQUEST_SCOPED,
          contextId,
        ),
      ),
    );

    expect(payloads).to.deep.equal(
      contexts.map(({ request }) => ({ requestId: request.requestId })),
    );
    expect(new Set(payloads).size).to.equal(contexts.length);
  });

  it('should bubble singleton providers to request scope during overlapping context resolutions', async function () {
    this.timeout(20000);
    const contexts = prepareContexts(testingModule, OVERLAP_REQUEST_COUNT);

    const providers = await Promise.all(
      contexts.map(({ contextId }) =>
        testingModule.resolve(BubbledProvider, contextId),
      ),
    );

    expect(new Set(providers).size).to.equal(contexts.length);
    expect(providers.map(provider => provider.payload)).to.deep.equal(
      contexts.map(({ request }) => ({ requestId: request.requestId })),
    );
    expect(
      providers.map(provider => provider.requestReader.request.requestId),
    ).to.deep.equal(contexts.map(({ request }) => request.requestId));
  });

  it('should reuse a request-scoped factory provider for overlapping resolutions in the same context', async function () {
    this.timeout(20000);
    const [{ contextId, request }] = prepareContexts(testingModule, 1);

    const providers = await Promise.all(
      Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
        testingModule.resolve<{ requestId: string }>(
          SAME_CONTEXT_REQUEST_SCOPED,
          contextId,
        ),
      ),
    );

    expect(new Set(providers).size).to.equal(1);
    expect(providers[0]).to.deep.equal({ requestId: request.requestId });
  });

  it('should reuse a bubbled provider for overlapping resolutions in the same context', async function () {
    this.timeout(20000);
    const [{ contextId, request }] = prepareContexts(testingModule, 1);

    const providers = await Promise.all(
      Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
        testingModule.resolve(SameContextBubbledProvider, contextId),
      ),
    );

    expect(new Set(providers).size).to.equal(1);
    expect(providers[0].payload).to.deep.equal({
      requestId: request.requestId,
    });
    expect(providers[0].requestReader.request).to.equal(request);
  });

  it('should isolate request-scoped controllers during overlapping context resolutions', async function () {
    this.timeout(20000);
    const contexts = prepareContexts(testingModule, OVERLAP_REQUEST_COUNT);

    const controllers = await Promise.all(
      contexts.map(({ contextId }) =>
        testingModule.resolve(ParallelController, contextId),
      ),
    );

    expect(new Set(controllers).size).to.equal(contexts.length);
    expect(controllers.map(controller => controller.payload)).to.deep.equal(
      contexts.map(({ request }) => ({ requestId: request.requestId })),
    );
    expect(
      controllers.map(controller => controller.requestReader.request.requestId),
    ).to.deep.equal(contexts.map(({ request }) => request.requestId));
  });
});
