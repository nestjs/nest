import { expect } from 'chai';
import 'reflect-metadata';
import { Router } from '../../decorators/router.decorator';
import {
  Query,
  Mutation,
  Subscription,
} from '../../decorators/procedure.decorator';
import { Input } from '../../decorators/input.decorator';
import { TrpcContext } from '../../decorators/ctx.decorator';
import {
  TRPC_ROUTER_METADATA,
  TRPC_PROCEDURE_METADATA,
  TRPC_PROCEDURE_TYPE_METADATA,
  TRPC_INPUT_METADATA,
  TRPC_OUTPUT_METADATA,
  TRPC_PARAM_ARGS_METADATA,
} from '../../constants';
import { ProcedureType, TrpcParamtype } from '../../enums';
import { z } from 'zod';

describe('tRPC Decorators', () => {
  describe('@Router()', () => {
    it('should set TRPC_ROUTER_METADATA on the class', () => {
      @Router()
      class TestRouter {}

      const metadata = Reflect.getMetadata(TRPC_ROUTER_METADATA, TestRouter);
      expect(metadata).to.deep.equal({ alias: undefined });
    });

    it('should set alias when provided', () => {
      @Router('users')
      class UsersRouter {}

      const metadata = Reflect.getMetadata(TRPC_ROUTER_METADATA, UsersRouter);
      expect(metadata).to.deep.equal({ alias: 'users' });
    });
  });

  describe('@Query()', () => {
    it('should set procedure metadata with method name as default', () => {
      class TestRouter {
        @Query()
        getAll() {
          return [];
        }
      }

      const instance = new TestRouter();
      const metadata = Reflect.getMetadata(
        TRPC_PROCEDURE_METADATA,
        instance.getAll,
      );
      const type = Reflect.getMetadata(
        TRPC_PROCEDURE_TYPE_METADATA,
        instance.getAll,
      );
      expect(metadata).to.equal('getAll');
      expect(type).to.equal(ProcedureType.QUERY);
    });

    it('should use custom name when provided', () => {
      class TestRouter {
        @Query('list')
        getAll() {
          return [];
        }
      }

      const instance = new TestRouter();
      const metadata = Reflect.getMetadata(
        TRPC_PROCEDURE_METADATA,
        instance.getAll,
      );
      expect(metadata).to.equal('list');
    });

    it('should set input schema metadata', () => {
      const schema = z.object({ id: z.string() });

      class TestRouter {
        @Query({ input: schema })
        getById() {
          return {};
        }
      }

      const instance = new TestRouter();
      const inputMeta = Reflect.getMetadata(
        TRPC_INPUT_METADATA,
        instance.getById,
      );
      expect(inputMeta).to.equal(schema);
    });

    it('should set output schema metadata', () => {
      const schema = z.object({ name: z.string() });

      class TestRouter {
        @Query({ output: schema })
        getAll() {
          return [];
        }
      }

      const instance = new TestRouter();
      const outputMeta = Reflect.getMetadata(
        TRPC_OUTPUT_METADATA,
        instance.getAll,
      );
      expect(outputMeta).to.equal(schema);
    });

    it('should accept name and options together', () => {
      const inputSchema = z.object({ id: z.number() });

      class TestRouter {
        @Query('findOne', { input: inputSchema })
        getById() {
          return {};
        }
      }

      const instance = new TestRouter();
      const nameMeta = Reflect.getMetadata(
        TRPC_PROCEDURE_METADATA,
        instance.getById,
      );
      const inputMeta = Reflect.getMetadata(
        TRPC_INPUT_METADATA,
        instance.getById,
      );
      expect(nameMeta).to.equal('findOne');
      expect(inputMeta).to.equal(inputSchema);
    });
  });

  describe('@Mutation()', () => {
    it('should set mutation type metadata', () => {
      class TestRouter {
        @Mutation()
        create() {
          return {};
        }
      }

      const instance = new TestRouter();
      const type = Reflect.getMetadata(
        TRPC_PROCEDURE_TYPE_METADATA,
        instance.create,
      );
      expect(type).to.equal(ProcedureType.MUTATION);
    });
  });

  describe('@Subscription()', () => {
    it('should set subscription type metadata', () => {
      class TestRouter {
        @Subscription()
        onUpdate() {
          return {};
        }
      }

      const instance = new TestRouter();
      const type = Reflect.getMetadata(
        TRPC_PROCEDURE_TYPE_METADATA,
        instance.onUpdate,
      );
      expect(type).to.equal(ProcedureType.SUBSCRIPTION);
    });
  });

  describe('Parameter decorators', () => {
    it('should store parameter metadata for @Input and @TrpcContext', () => {
      class TestRouter {
        method(
          @Input() input: unknown,
          @Input('name') name: unknown,
          @TrpcContext() ctx: unknown,
          @TrpcContext('requestId') requestId: unknown,
        ) {
          return { input, name, ctx, requestId };
        }
      }

      const instance = new TestRouter();
      const metadata = Reflect.getMetadata(
        TRPC_PARAM_ARGS_METADATA,
        instance.method,
      );

      expect(metadata).to.deep.equal([
        { index: 0, type: TrpcParamtype.INPUT, data: undefined },
        { index: 1, type: TrpcParamtype.INPUT, data: 'name' },
        { index: 2, type: TrpcParamtype.CONTEXT, data: undefined },
        { index: 3, type: TrpcParamtype.CONTEXT, data: 'requestId' },
      ]);
    });
  });
});
