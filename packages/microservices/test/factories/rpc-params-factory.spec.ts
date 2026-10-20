import { RpcParamtype } from '../../enums/rpc-paramtype.enum.js';
import { RpcParamsFactory } from '../../factories/rpc-params-factory.js';

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
          ).toEqual(payload);
        });
        it('should return a message payload object with parameter extraction', () => {
          expect(
            factory.exchangeKeyForValue(RpcParamtype.PAYLOAD, 'data', args),
          ).toEqual(payload.data);
        });
        describe('with parameter extraction', () => {
          const extract = (value: unknown, key: string) =>
            factory.exchangeKeyForValue(RpcParamtype.PAYLOAD, key, [
              value,
              ctx,
            ]);

          it('should not resolve the key against the prototype of an array, a Buffer or a primitive', () => {
            expect(extract(Buffer.from('x'), 'parent')).toBeUndefined();
            expect(extract([], 'values')).toBeUndefined();
            expect(extract('text', 'search')).toBeUndefined();
            expect(extract(null, 'data')).toBeUndefined();
          });
          it('should still resolve their own properties', () => {
            expect(extract(['a'], '0')).toBe('a');
            expect(extract('text', 'length')).toBe(4);
          });
          it('should still resolve the inherited properties of an object', () => {
            // e.g. a deserializer that decodes protobuf messages, whose
            // default field values live on the prototype
            class Message {}
            Object.assign(Message.prototype, { text: '' });
            expect(extract(new Message(), 'text')).toBe('');
          });
        });
      });
      describe(`RpcParamtype.CONTEXT`, () => {
        it('should return a ctx object', () => {
          expect(
            factory.exchangeKeyForValue(RpcParamtype.CONTEXT, null!, args),
          ).toEqual(ctx);
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
