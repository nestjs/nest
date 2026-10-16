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
        describe('with parameter extraction', () => {
          const extract = (payload: unknown, key: string) =>
            factory.exchangeKeyForValue(WsParamtype.PAYLOAD, key, [
              client,
              payload,
            ]);

          it('should not resolve the key against the prototype of an array, a Buffer or a primitive', () => {
            expect(extract(Buffer.from('x'), 'parent')).to.be.undefined;
            expect(extract(Buffer.from('x'), 'buffer')).to.be.undefined;
            expect(extract([], 'values')).to.be.undefined;
            expect(extract('text', 'search')).to.be.undefined;
            expect(extract(1, 'toFixed')).to.be.undefined;
            expect(extract(null, 'data')).to.be.undefined;
          });
          it('should still resolve their own properties', () => {
            expect(extract(['a'], '0')).to.equal('a');
            expect(extract(['a'], 'length')).to.equal(1);
            expect(extract('text', 'length')).to.equal(4);
          });
          it('should still resolve the inherited properties of an object', () => {
            class Message {
              get text() {
                return 'hi';
              }
            }
            expect(extract(new Message(), 'text')).to.equal('hi');
          });
        });
      });
      describe(`WsParamtype.SOCKET`, () => {
        it('should return a connected socket object', () => {
          expect(
            factory.exchangeKeyForValue(WsParamtype.SOCKET, null!, args),
          ).to.be.eql(client);
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
