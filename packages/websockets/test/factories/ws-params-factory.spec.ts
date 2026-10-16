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
        describe('with parameter extraction', () => {
          const extract = (payload: unknown, key: string) =>
            factory.exchangeKeyForValue(WsParamtype.PAYLOAD, key, [
              client,
              payload,
            ]);

          it('should not resolve the key against the prototype of an array, a Buffer or a primitive', () => {
            expect(extract(Buffer.from('x'), 'parent')).toBeUndefined();
            expect(extract(Buffer.from('x'), 'buffer')).toBeUndefined();
            expect(extract([], 'values')).toBeUndefined();
            expect(extract('text', 'search')).toBeUndefined();
            expect(extract(1, 'toFixed')).toBeUndefined();
            expect(extract(null, 'data')).toBeUndefined();
          });
          it('should still resolve their own properties', () => {
            expect(extract(['a'], '0')).toBe('a');
            expect(extract(['a'], 'length')).toBe(1);
            expect(extract('text', 'length')).toBe(4);
          });
          it('should still resolve the inherited properties of an object', () => {
            class Message {
              get text() {
                return 'hi';
              }
            }
            expect(extract(new Message(), 'text')).toBe('hi');
          });
        });
      });
      describe(`WsParamtype.SOCKET`, () => {
        it('should return a connected socket object', () => {
          expect(
            factory.exchangeKeyForValue(WsParamtype.SOCKET, null!, args),
          ).toEqual(client);
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
