import { expect } from 'chai';
import { ReflectRouteParamDecorator } from '../../utils/decorators/reflect-route-param-metadata.decorator';
import { CUSTOM_ROUTE_AGRS_METADATA } from '../../constants';

describe('ReflectRouteParamDecorator', () => {
  let key;
  let reflector;
  let result;

  beforeEach(() => {
    key = 'key';
    reflector = (data, req, res, next) => true;
    result = ReflectRouteParamDecorator(reflector, key);
  });
  it('should return a function as a first element', () => {
    expect(result).to.be.a('function');
  });
});
