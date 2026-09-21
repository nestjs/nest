import { WS_PATH_PARAMS } from '../../constants.js';
import { WsParamtype } from '../../enums/ws-paramtype.enum.js';
import { WsParamsFactory } from '../../factories/ws-params-factory.js';

describe('WsParamsFactory', () => {
  let factory: WsParamsFactory;
  beforeEach(() => {
    factory = new WsParamsFactory();
  });
  describe('exchangeKeyForValue', () => {
    const client = {};
    const data = { data: true };

    describe('when key is', () => {
      const args = [client, data];
      describe(`WsParamtype.PAYLOAD`, () => {
        it('should return a message payload object', () => {
          expect(
            factory.exchangeKeyForValue(WsParamtype.PAYLOAD, null!, args),
          ).toEqual(data);
        });
        it('should return a message payload object with parameter extraction', () => {
          expect(
            factory.exchangeKeyForValue(WsParamtype.PAYLOAD, 'data', args),
          ).toEqual(data.data);
        });
      });
      describe(`WsParamtype.SOCKET`, () => {
        it('should return a connected socket object', () => {
          expect(
            factory.exchangeKeyForValue(WsParamtype.SOCKET, null!, args),
          ).toEqual(client);
        });
      });
      describe(`WsParamtype.PARAM`, () => {
        it('should return all path parameters when no property is specified', () => {
          const pathParams = { roomId: '123', userId: '456' };
          const clientWithParams = { [WS_PATH_PARAMS]: pathParams };
          const argsWithParams = [clientWithParams, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              null!,
              argsWithParams,
            ),
          ).toEqual(pathParams);
        });

        it('should return specific path parameter when property is specified', () => {
          const pathParams = { roomId: '123', userId: '456' };
          const clientWithParams = { [WS_PATH_PARAMS]: pathParams };
          const argsWithParams = [clientWithParams, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              'roomId',
              argsWithParams,
            ),
          ).toEqual('123');
        });

        it('should return undefined for non-existent parameter', () => {
          const pathParams = { roomId: '123' };
          const clientWithParams = { [WS_PATH_PARAMS]: pathParams };
          const argsWithParams = [clientWithParams, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              'nonExistent',
              argsWithParams,
            ),
          ).toBeUndefined();
        });

        it('should handle client without path parameters', () => {
          const clientWithoutParams = {};
          const argsWithoutParams = [clientWithoutParams, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              'roomId',
              argsWithoutParams,
            ),
          ).toBeUndefined();

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              null!,
              argsWithoutParams,
            ),
          ).toEqual({});
        });
      });
    });
    describe('when key is not available', () => {
      it('should return null', () => {
        expect(factory.exchangeKeyForValue(-1, null!, [])).toEqual(null);
      });
    });
    describe('when args are not available', () => {
      it('should return null', () => {
        expect(factory.exchangeKeyForValue(null!, null!, null!)).toEqual(null);
      });
    });
  });
});
