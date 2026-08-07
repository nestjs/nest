import { expect } from 'chai';
import { WsParamtype } from '../../enums/ws-paramtype.enum';
import { WsParamsFactory } from '../../factories/ws-params-factory';

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
          ).to.be.eql(data);
        });
        it('should return a message payload object with parameter extraction', () => {
          expect(
            factory.exchangeKeyForValue(WsParamtype.PAYLOAD, 'data', args),
          ).to.be.eql(data.data);
        });
      });
      describe(`WsParamtype.SOCKET`, () => {
        it('should return a connected socket object', () => {
          expect(
            factory.exchangeKeyForValue(WsParamtype.SOCKET, null!, args),
          ).to.be.eql(client);
        });
      });
      describe(`WsParamtype.PARAM`, () => {
        it('should return all path parameters when no property is specified', () => {
          const pathParams = { roomId: '123', userId: '456' };
          const clientWithParams = { _pathParams: pathParams };
          const argsWithParams = [clientWithParams, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              null!,
              argsWithParams,
            ),
          ).to.be.eql(pathParams);
        });

        it('should return specific path parameter when property is specified', () => {
          const pathParams = { roomId: '123', userId: '456' };
          const clientWithParams = { _pathParams: pathParams };
          const argsWithParams = [clientWithParams, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              'roomId',
              argsWithParams,
            ),
          ).to.be.eql('123');
        });

        it('should return undefined for non-existent parameter', () => {
          const pathParams = { roomId: '123' };
          const clientWithParams = { _pathParams: pathParams };
          const argsWithParams = [clientWithParams, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              'nonExistent',
              argsWithParams,
            ),
          ).to.be.undefined;
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
          ).to.be.undefined;

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              null!,
              argsWithoutParams,
            ),
          ).to.be.eql({});
        });

        it('should fallback to upgradeReq.params if _pathParams is not available', () => {
          const pathParams = { roomId: '789' };
          const clientWithUpgradeReq = { upgradeReq: { params: pathParams } };
          const argsWithUpgradeReq = [clientWithUpgradeReq, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              'roomId',
              argsWithUpgradeReq,
            ),
          ).to.be.eql('789');
        });

        it('should fallback to request.params if _pathParams and upgradeReq.params are not available', () => {
          const pathParams = { roomId: '999' };
          const clientWithRequest = { request: { params: pathParams } };
          const argsWithRequest = [clientWithRequest, data];

          expect(
            factory.exchangeKeyForValue(
              WsParamtype.PARAM,
              'roomId',
              argsWithRequest,
            ),
          ).to.be.eql('999');
        });
      });
    });
    describe('when key is not available', () => {
      it('should return null', () => {
        expect(factory.exchangeKeyForValue(-1, null!, [])).to.be.eql(null);
      });
    });
    describe('when args are not available', () => {
      it('should return null', () => {
        expect(factory.exchangeKeyForValue(null!, null!, null!)).to.be.eql(
          null,
        );
      });
    });
  });
});
