import { CUSTOM_ROUTE_AGRS_METADATA } from '@nestjs/common/constants';
import { Body, createParamDecorator, Request } from '@nestjs/common/decorators';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { expect } from 'chai';

import { ROUTE_ARGS_METADATA } from '../../../common/constants';
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
    it('should returns ROUTE_ARGS_METADATA callback metadata', () => {
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
        [`custom${CUSTOM_ROUTE_AGRS_METADATA}:2`]: {
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
      const custom = keys.find(key => key.includes(CUSTOM_ROUTE_AGRS_METADATA));

      expect(metadata[custom]).to.be.an('object');
      expect(metadata[custom].index).to.be.eq(2);
      expect(metadata[custom].data).to.be.eq(undefined);
      expect(metadata[custom].factory).to.be.a('function');
    });
  });
  describe('getArgumentsLength', () => {
    it('should returns maximum index + 1 (length) placed in array', () => {
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
    it('should return "paramsProperties" when paramtypes array doesnt exists', () => {
      const paramsProperties = ['1'];
      expect(
        contextUtils.mergeParamsMetatypes(paramsProperties as any, null),
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
            customFactory,
            undefined,
            contextFactory,
          )(),
        ).to.be.eql(null);
      });
    });
  });
});
