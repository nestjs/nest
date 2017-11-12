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
  it('should return an array', () => {
    expect(result).to.be.an('array');
  });
  it('should return a function as a first element', () => {
    expect(result[0]).to.be.a('function');
  });
  it('should return reflector object as a second element', () => {
    expect(result[1]).to.be.an('object');
    expect(result[1]).to.have.property('paramtype');
    expect(result[1]).to.have.property('reflector');
    expect(result[1].reflector).to.be.eql(reflector);
  });
  it('should return paramtype with a key string', () => {
    expect(result[1].paramtype).to.be.eql(`${key}${CUSTOM_ROUTE_AGRS_METADATA}`);
  });
  it('should return paramtype as a rundom string', () => {
    result = ReflectRouteParamDecorator(reflector);
    expect(result[1].paramtype).to.not.be.eql(`${key}${CUSTOM_ROUTE_AGRS_METADATA}`);
  });
});

