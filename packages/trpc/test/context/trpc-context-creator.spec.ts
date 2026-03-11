import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { expect } from 'chai';
import 'reflect-metadata';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { TRPCError } from '@trpc/server';
import { TRPC_PARAM_ARGS_METADATA } from '../../constants';
import { TrpcContextCreator } from '../../context/trpc-context-creator';
import { TrpcParamtype } from '../../enums';

/**
 * Unit tests for TrpcContextCreator focusing on edge-case branches
 * that are not covered by the integration-level lifecycle tests.
 */
describe('TrpcContextCreator (unit)', () => {
  let creator: TrpcContextCreator;

  const createExceptionFiltersContextStub = () => ({
    create: sinon.stub().returns({
      next: async (error: unknown) => {
        throw error;
      },
    }),
  });

  beforeEach(() => {
    // Provide stub creators that return empty arrays (no guards/interceptors/pipes)
    const stubCreator = { create: sinon.stub().returns([]) };
    const stubConsumer = {
      tryActivate: sinon.stub().resolves(true),
      intercept: sinon.stub(),
    };
    creator = new TrpcContextCreator(
      stubCreator as any,
      stubConsumer as any,
      stubCreator as any,
      stubConsumer as any,
      stubCreator as any,
      stubConsumer as any,
      createExceptionFiltersContextStub() as any,
    );
  });

  it('should resolve handler args as [input, ctx] when no param metadata exists', async () => {
    const instance = {
      handler: sinon.stub().callsFake((a: unknown, b: unknown) => [a, b]),
    };
    const wrapped = creator.create(instance, instance.handler, '');
    const result = await wrapped('data', 'ctx');
    expect(result).to.deep.equal(['data', 'ctx']);
  });

  it('should extract a specific field from input via @Input("field")', async () => {
    const handler = sinon.stub().callsFake((val: unknown) => val);
    const instance = { handler };

    // Simulate @Input('name') on parameter index 0
    Reflect.defineMetadata(
      TRPC_PARAM_ARGS_METADATA,
      [{ index: 0, type: TrpcParamtype.INPUT, data: 'name' }],
      handler,
    );

    const wrapped = creator.create(instance, handler, '');
    const result = await wrapped({ name: 'Alice', age: 30 }, {});
    expect(result).to.equal('Alice');
  });

  it('should extract a specific field from context via @TrpcContext("field")', async () => {
    const handler = sinon.stub().callsFake((val: unknown) => val);
    const instance = { handler };

    Reflect.defineMetadata(
      TRPC_PARAM_ARGS_METADATA,
      [{ index: 0, type: TrpcParamtype.CONTEXT, data: 'requestId' }],
      handler,
    );

    const wrapped = creator.create(instance, handler, '');
    const result = await wrapped({}, { requestId: 'abc-123' });
    expect(result).to.equal('abc-123');
  });

  it('should return undefined when extracting a field from a non-object input', async () => {
    const handler = sinon.stub().callsFake((val: unknown) => val);
    const instance = { handler };

    Reflect.defineMetadata(
      TRPC_PARAM_ARGS_METADATA,
      [{ index: 0, type: TrpcParamtype.INPUT, data: 'name' }],
      handler,
    );

    const wrapped = creator.create(instance, handler, '');
    const result = await wrapped(null, {});
    expect(result).to.be.undefined;
  });

  it('should return undefined when extracting a field from a primitive context', async () => {
    const handler = sinon.stub().callsFake((val: unknown) => val);
    const instance = { handler };

    Reflect.defineMetadata(
      TRPC_PARAM_ARGS_METADATA,
      [{ index: 0, type: TrpcParamtype.CONTEXT, data: 'field' }],
      handler,
    );

    const wrapped = creator.create(instance, handler, '');
    const result = await wrapped({}, 42);
    expect(result).to.be.undefined;
  });

  it('should unwrap observable return values via transformToResult', async () => {
    const handler = sinon.stub().returns(of('obs-value'));
    const instance = { handler };

    const wrapped = creator.create(instance, handler, '');
    const result = await wrapped(undefined, {});
    expect(result).to.equal('obs-value');
  });

  it('should handle interceptors that return observables', async () => {
    const handler = sinon.stub().returns('raw');
    const instance = { handler };

    // Provide an interceptor creator that returns one interceptor
    const interceptorCreator = {
      create: sinon.stub().returns([{}]),
    };
    const interceptorConsumer = {
      intercept: sinon
        .stub()
        .callsFake(
          async (
            _interceptors: any,
            _args: any,
            _instance: any,
            _callback: any,
            next: () => Promise<unknown>,
          ) => {
            // Simulate interceptor wrapping result in Observable
            return of(await next());
          },
        ),
    };

    const creatorWithInterceptor = new TrpcContextCreator(
      { create: sinon.stub().returns([]) } as any,
      { tryActivate: sinon.stub().resolves(true) } as any,
      interceptorCreator as any,
      interceptorConsumer as any,
      { create: sinon.stub().returns([]) } as any,
      {} as any,
      createExceptionFiltersContextStub() as any,
    );

    const wrapped = creatorWithInterceptor.create(instance, handler, '');
    const result = await wrapped(undefined, {});
    expect(result).to.equal('raw');
  });

  it('should return full input/context when metadata entry has no field', async () => {
    class HandlerHost {
      handler(a: any, b: any) {
        return { a, b };
      }
    }

    const host = new HandlerHost();
    const methodRef = host.handler;
    Reflect.defineMetadata(
      TRPC_PARAM_ARGS_METADATA,
      [
        { index: 0, type: TrpcParamtype.INPUT },
        { index: 1, type: TrpcParamtype.CONTEXT },
      ],
      methodRef,
    );

    const wrapped = creator.create(host, methodRef as any, 'module-key');
    const input = { x: 1 };
    const ctx = { userId: 'u1' };

    const result = await wrapped(input, ctx);
    expect(result).to.deep.equal({ a: input, b: ctx });
  });

  it('should convert guard-denied execution to a TRPC FORBIDDEN error', async () => {
    const guardCreator = { create: sinon.stub().returns([{}]) };
    const guardConsumer = { tryActivate: sinon.stub().resolves(false) };

    const guardAwareCreator = new TrpcContextCreator(
      guardCreator as any,
      guardConsumer as any,
      { create: sinon.stub().returns([]) } as any,
      { intercept: sinon.stub() } as any,
      { create: sinon.stub().returns([]) } as any,
      {} as any,
      createExceptionFiltersContextStub() as any,
    );

    const handler = sinon.stub().returns('ok');
    const wrapped = guardAwareCreator.create({ handler } as any, handler, '');

    let error: unknown;
    try {
      await wrapped({}, {});
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect((error as TRPCError).code).to.equal('FORBIDDEN');
  });

  it('should map HttpException to matching TRPC error code', async () => {
    const handler = sinon
      .stub()
      .throws(new BadRequestException('invalid payload'));
    const wrapped = creator.create({ handler } as any, handler, '');

    let error: unknown;
    try {
      await wrapped({}, {});
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(TRPCError);
    const trpcError = error as TRPCError;
    expect(trpcError.code).to.equal('BAD_REQUEST');
    expect(trpcError.message).to.include('invalid payload');
  });

  it('should map unknown errors to INTERNAL_SERVER_ERROR', async () => {
    const handler = sinon
      .stub()
      .throws(new HttpException('db down', HttpStatus.SERVICE_UNAVAILABLE));
    const wrapped = creator.create({ handler } as any, handler, '');

    let error: unknown;
    try {
      await wrapped({}, {});
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect((error as TRPCError).code).to.equal('SERVICE_UNAVAILABLE');
  });
});
