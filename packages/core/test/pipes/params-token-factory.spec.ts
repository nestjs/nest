import { expect } from 'chai';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { ParamsTokenFactory } from '../../pipes/params-token-factory';

describe('ParamsTokenFactory', () => {
  let factory: ParamsTokenFactory;
  beforeEach(() => {
    factory = new ParamsTokenFactory();
  });
  describe('exchangeEnumForString', () => {
    describe('when key is', () => {
      describe(`RouteParamtypes.BODY`, () => {
        it('should return body object', () => {
          expect(factory.exchangeEnumForString(RouteParamtypes.BODY)).to.be.eql(
            'body',
          );
        });
      });
      describe(`RouteParamtypes.QUERY`, () => {
        it('should return query object', () => {
          expect(
            factory.exchangeEnumForString(RouteParamtypes.QUERY),
          ).to.be.eql('query');
        });
      });
      describe(`RouteParamtypes.PARAM`, () => {
        it('should return params object', () => {
          expect(
            factory.exchangeEnumForString(RouteParamtypes.PARAM),
          ).to.be.eql('param');
        });
      });
      describe('not available', () => {
        it('should return "custom"', () => {
          expect(factory.exchangeEnumForString(-1)).to.be.eql('custom');
        });
      });
    });
  });
});
