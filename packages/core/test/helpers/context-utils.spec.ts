import { CUSTOM_ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import {
  Body,
  createParamDecorator,
  Request,
  Res,
} from '@nestjs/common/decorators/index.js';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';
import { ParseIntPipe, ValidationPipe } from '@nestjs/common/pipes/index.js';
import { Logger } from '@nestjs/common/services/logger.service.js';
import { ROUTE_ARGS_METADATA } from '../../../common/constants.js';
import { registerClassRef } from '../../helpers/class-ref-registry.js';
import { ContextUtils } from '../../helpers/context-utils.js';
import { ExecutionContextHost } from '../../helpers/execution-context-host.js';

describe('ContextUtils', () => {
  let contextUtils: ContextUtils;

  beforeEach(() => {
    contextUtils = new ContextUtils();
  });
  describe('reflectCallbackMetadata', () => {
    const CustomDecorator = createParamDecorator(() => {});
    class TestController {
      public callback(
        @Request() req,
        @Body() body,
        @CustomDecorator() custom,
      ) {}
    }
    it('should return ROUTE_ARGS_METADATA callback metadata', () => {
      const instance = new TestController();
      const metadata = contextUtils.reflectCallbackMetadata(
        instance,
        'callback',
        ROUTE_ARGS_METADATA,
      );

      const expectedMetadata = {
        [`${RouteParamtypes.REQUEST}:0`]: {
          index: 0,
          data: undefined,
          pipes: [],
        },
        [`${RouteParamtypes.BODY}:1`]: {
          index: 1,
          data: undefined,
          pipes: [],
        },
        [`custom${CUSTOM_ROUTE_ARGS_METADATA}:2`]: {
          index: 2,
          factory: () => {},
          data: undefined,
        },
      };
      expect(metadata[`${RouteParamtypes.REQUEST}:0`]).toEqual(
        expectedMetadata[`${RouteParamtypes.REQUEST}:0`],
      );
      expect(metadata[`${RouteParamtypes.REQUEST}:1`]).toEqual(
        expectedMetadata[`${RouteParamtypes.REQUEST}:1`],
      );

      const keys = Object.keys(metadata);
      const custom = keys.find(key =>
        key.includes(CUSTOM_ROUTE_ARGS_METADATA),
      )!;

      expect(metadata[custom]).toBeTypeOf('object');
      expect(metadata[custom].index).toBe(2);
      expect(metadata[custom].data).toBe(undefined);
      expect(metadata[custom].factory).toBeTypeOf('function');
    });
  });
  describe('when a mixin helper overwrote the "constructor" of the host prototype', () => {
    class MixinDto {}
    class HostDto {}
    class Mixin {
      public mixedIn(@Request() req, @Body() body: MixinDto) {}
    }
    class Host {
      public own(
        @Body(ParseIntPipe) body: HostDto,
        @Res({ passthrough: true }) res,
      ) {}
    }
    // What the TypeScript handbook's `applyMixins()` does
    Object.defineProperties(
      Host.prototype,
      Object.getOwnPropertyDescriptors(Mixin.prototype),
    );
    registerClassRef(Host);

    it('should reflect the parameters of a handler that the host declares', () => {
      const metadata = contextUtils.reflectCallbackMetadata(
        new Host(),
        'own',
        ROUTE_ARGS_METADATA,
      );
      expect(metadata[`${RouteParamtypes.BODY}:0`].pipes).toEqual([
        ParseIntPipe,
      ]);
      expect(contextUtils.reflectPassthrough(new Host(), 'own')).toBe(true);
      expect(contextUtils.reflectCallbackParamtypes(new Host(), 'own')).toEqual(
        [HostDto, Object],
      );
    });
    it('should reflect the parameters of a handler copied from the mixin', () => {
      const metadata = contextUtils.reflectCallbackMetadata(
        new Host(),
        'mixedIn',
        ROUTE_ARGS_METADATA,
      );
      expect(Object.keys(metadata).sort()).toEqual(
        [`${RouteParamtypes.REQUEST}:0`, `${RouteParamtypes.BODY}:1`].sort(),
      );
      expect(
        contextUtils.reflectCallbackParamtypes(new Host(), 'mixedIn'),
      ).toEqual([Object, MixinDto]);
    });
  });
  describe('getArgumentsLength', () => {
    it('should return maximum index + 1 (length) placed in array', () => {
      const max = 4;
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0 },
        [RouteParamtypes.BODY]: {
          index: max,
        },
      };
      expect(
        contextUtils.getArgumentsLength(Object.keys(metadata), metadata),
      ).toBe(max + 1);
    });
  });
  describe('createNullArray', () => {
    it('should create N size array filled with null', () => {
      const size = 3;
      expect(contextUtils.createNullArray(size)).toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });
  });
  describe('mergeParamsMetatypes', () => {
    it('should return "paramsProperties" when paramtypes array doesn\'t exists', () => {
      const paramsProperties = ['1'];
      expect(
        contextUtils.mergeParamsMetatypes(paramsProperties as any, null!),
      ).toEqual(paramsProperties);
    });
  });
  describe('getCustomFactory', () => {
    const contextFactory = (args: unknown[]) => new ExecutionContextHost(args);

    describe('when factory is function', () => {
      it('should return curried factory', () => {
        const data = 3;
        const result = 10;
        const customFactory = (_, req) => result;

        expect(
          contextUtils.getCustomFactory(customFactory, data, contextFactory)(),
        ).toEqual(result);
      });
    });
    describe('when factory is undefined / is not a function', () => {
      it('should return curried null identity', () => {
        const customFactory = undefined;
        expect(
          contextUtils.getCustomFactory(
            customFactory!,
            undefined,
            contextFactory,
          )(),
        ).toEqual(null);
      });
    });
  });

  describe('mapParamType', () => {
    it('should return the type portion before the colon', () => {
      expect(contextUtils.mapParamType('body:0')).toBe('body');
    });

    it('should return the key itself when no colon present', () => {
      expect(contextUtils.mapParamType('request')).toBe('request');
    });
  });

  describe('reflectCallbackParamtypes', () => {
    it('should return undefined when no paramtypes metadata exists', () => {
      class NoDecorators {
        handler() {}
      }
      const result = contextUtils.reflectCallbackParamtypes(
        new NoDecorators(),
        'handler',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('warnOnMissingParamtypes', () => {
    const paramWith = (type: number | string, ...pipes: any[]) => [
      {
        index: 0,
        type,
        data: undefined,
        pipes,
        extractValue: (() => {}) as any,
      },
    ];
    const bodyWith = (...pipes: any[]) =>
      paramWith(RouteParamtypes.BODY, ...pipes);

    let instance: { create(body: unknown): void };
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // A handler is warned about once, so each test declares its own
      class TestController {
        public create(body: unknown) {}
      }
      instance = new TestController();
      warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('should warn when a ValidationPipe is bound to the handler', () => {
      contextUtils.warnOnMissingParamtypes(
        instance,
        'create',
        undefined,
        [new ValidationPipe()],
        bodyWith(),
      );
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain(
        'The TestController.create() handler has no decorator metadata',
      );
    });

    it('should warn when a ValidationPipe is bound to a parameter', () => {
      contextUtils.warnOnMissingParamtypes(
        instance,
        'create',
        undefined,
        [],
        bodyWith(new ValidationPipe()),
      );
      expect(warn).toHaveBeenCalledOnce();
    });

    it('should warn once per handler', () => {
      const hosts = [instance, new (instance.constructor as any)()];
      for (const host of hosts) {
        new ContextUtils().warnOnMissingParamtypes(
          host,
          'create',
          undefined,
          [new ValidationPipe()],
          bodyWith(),
        );
      }
      expect(warn).toHaveBeenCalledOnce();
    });

    it('should not warn when the handler has parameter types', () => {
      contextUtils.warnOnMissingParamtypes(
        instance,
        'create',
        [Object],
        [new ValidationPipe()],
        bodyWith(),
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it('should not warn when no ValidationPipe is bound', () => {
      contextUtils.warnOnMissingParamtypes(
        instance,
        'create',
        undefined,
        [{ transform: (value: unknown) => value }],
        bodyWith(new ParseIntPipe()),
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it('should not warn when the ValidationPipe of the parameter has an expected type', () => {
      class Dto {}
      contextUtils.warnOnMissingParamtypes(
        instance,
        'create',
        undefined,
        [new ValidationPipe()],
        bodyWith(new ValidationPipe({ expectedType: Dto })),
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it('should not warn for the parameters of a custom decorator', () => {
      contextUtils.warnOnMissingParamtypes(
        instance,
        'create',
        undefined,
        [new ValidationPipe()],
        paramWith(`custom${CUSTOM_ROUTE_ARGS_METADATA}`),
      );
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('getContextFactory', () => {
    it('should return a factory that creates ExecutionContextHost with type set', () => {
      class MyController {}
      const callback = () => {};
      const factory = contextUtils.getContextFactory(
        'http',
        new MyController(),
        callback,
      );
      const ctx = factory(['arg1', 'arg2']);
      expect(ctx).toBeInstanceOf(ExecutionContextHost);
      expect(ctx.getType()).toBe('http');
      expect(ctx.getClass()).toBe(MyController);
      expect(ctx.getHandler()).toBe(callback);
      expect(ctx.getArgs()).toEqual(['arg1', 'arg2']);
    });

    it('should handle undefined instance and callback', () => {
      const factory = contextUtils.getContextFactory('rpc');
      const ctx = factory([]);
      expect(ctx.getType()).toBe('rpc');
      expect(ctx.getClass()).toBeFalsy();
    });
  });

  describe('reflectPassthrough', () => {
    it('should return undefined when no passthrough metadata exists', () => {
      class NoPassthrough {
        handler() {}
      }
      const result = contextUtils.reflectPassthrough(
        new NoPassthrough(),
        'handler',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('getArgumentsLength', () => {
    it('should return 0 when keys array is empty', () => {
      expect(contextUtils.getArgumentsLength([], {})).toBe(0);
    });
  });

  describe('mergeParamsMetatypes', () => {
    it('should merge metatype from paramtypes array by index', () => {
      const params = [
        {
          index: 0,
          type: 'body',
          data: undefined,
          pipes: [],
          extractValue: (() => {}) as any,
        },
        {
          index: 1,
          type: 'param',
          data: 'id',
          pipes: [],
          extractValue: (() => {}) as any,
        },
      ];
      const paramtypes = [String, Number, Boolean];
      const result = contextUtils.mergeParamsMetatypes(params, paramtypes);
      expect(result[0].metatype).toBe(String);
      expect(result[1].metatype).toBe(Number);
    });
  });
});
