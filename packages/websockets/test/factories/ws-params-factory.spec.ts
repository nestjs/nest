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
            factory.exchangeKeyForValue(WsParamtype.PAYLOAD, null, args),
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
            factory.exchangeKeyForValue(WsParamtype.SOCKET, null, args),
          ).to.be.eql(client);
        });
      });
    });
    describe('when key is not available', () => {
      it('should return null', () => {
        expect(factory.exchangeKeyForValue(-1, null, [])).to.be.eql(null);
      });
    });
    describe('when args are not available', () => {
      it('should return null', () => {
        expect(factory.exchangeKeyForValue(null, null, null)).to.be.eql(null);
      });
    });
  });
});
