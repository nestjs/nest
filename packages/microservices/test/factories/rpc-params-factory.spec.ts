import { expect } from 'chai';
import { RpcParamtype } from '../../enums/rpc-paramtype.enum';
import { RpcParamsFactory } from '../../factories/rpc-params-factory';

describe('RpcParamsFactory', () => {
  let factory: RpcParamsFactory;
  beforeEach(() => {
    factory = new RpcParamsFactory();
  });
  describe('exchangeKeyForValue', () => {
    const ctx = {};
    const payload = { data: true };

    describe('when key is', () => {
      const args = [payload, ctx];
      describe(`RpcParamtype.PAYLOAD`, () => {
        it('should return a message payload object', () => {
          expect(
            factory.exchangeKeyForValue(RpcParamtype.PAYLOAD, null!, args),
          ).to.be.eql(payload);
        });
        it('should return a message payload object with parameter extraction', () => {
          expect(
            factory.exchangeKeyForValue(RpcParamtype.PAYLOAD, 'data', args),
          ).to.be.eql(payload.data);
        });
      });
      describe(`RpcParamtype.CONTEXT`, () => {
        it('should return a ctx object', () => {
          expect(
            factory.exchangeKeyForValue(RpcParamtype.CONTEXT, null!, args),
          ).to.be.eql(ctx);
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
