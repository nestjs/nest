import { CUSTOM_ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import {
  Body,
  createParamDecorator,
  Request,
  Res,
} from '@nestjs/common/decorators';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { ParseIntPipe } from '@nestjs/common/pipes';
import { expect } from 'chai';
import { ROUTE_ARGS_METADATA } from '../../../common/constants';
import { registerClassRef } from '../../helpers/class-ref-registry';
import { ContextUtils } from '../../helpers/context-utils';
import { ExecutionContextHost } from '../../helpers/execution-context-host';

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
      expect(metadata[`${RouteParamtypes.REQUEST}:0`]).to.deep.equal(
        expectedMetadata[`${RouteParamtypes.REQUEST}:0`],
      );
      expect(metadata[`${RouteParamtypes.REQUEST}:1`]).to.deep.equal(
        expectedMetadata[`${RouteParamtypes.REQUEST}:1`],
      );

      const keys = Object.keys(metadata);
      const custom = keys.find(key =>
        key.includes(CUSTOM_ROUTE_ARGS_METADATA),
      )!;

      expect(metadata[custom]).to.be.an('object');
      expect(metadata[custom].index).to.be.eq(2);
      expect(metadata[custom].data).to.be.eq(undefined);
      expect(metadata[custom].factory).to.be.a('function');
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
      expect(metadata[`${RouteParamtypes.BODY}:0`].pipes).to.deep.equal([
        ParseIntPipe,
      ]);
      expect(contextUtils.reflectPassthrough(new Host(), 'own')).to.equal(true);
      expect(
        contextUtils.reflectCallbackParamtypes(new Host(), 'own'),
      ).to.deep.equal([HostDto, Object]);
    });
    it('should reflect the parameters of a handler copied from the mixin', () => {
      const metadata = contextUtils.reflectCallbackMetadata(
        new Host(),
        'mixedIn',
        ROUTE_ARGS_METADATA,
      );
      expect(Object.keys(metadata).sort()).to.deep.equal(
        [`${RouteParamtypes.REQUEST}:0`, `${RouteParamtypes.BODY}:1`].sort(),
      );
      expect(
        contextUtils.reflectCallbackParamtypes(new Host(), 'mixedIn'),
      ).to.deep.equal([Object, MixinDto]);
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
      ).to.be.eq(max + 1);
    });
  });
  describe('createNullArray', () => {
    it('should create N size array filled with null', () => {
      const size = 3;
      expect(contextUtils.createNullArray(size)).to.be.deep.eq([
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
      ).to.be.eql(paramsProperties);
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
        ).to.be.eql(result);
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
        ).to.be.eql(null);
      });
    });
  });
});
