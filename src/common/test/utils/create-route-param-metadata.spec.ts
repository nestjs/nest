import { expect } from 'chai';
import { createRouteParamDecorator } from '../../utils/decorators/create-route-param-metadata.decorator';
import { CUSTOM_ROUTE_AGRS_METADATA } from '../../constants';

describe('ReflectRouteParamDecorator', () => {
  let key;
  let reflector;
  let result;

  beforeEach(() => {
    key = 'key';
    reflector = (data, req, res, next) => true;
    result = createRouteParamDecorator(reflector);
  });
  it('should return a function as a first element', () => {
    expect(result).to.be.a('function');
  });
});
