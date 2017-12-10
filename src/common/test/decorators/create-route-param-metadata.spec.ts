import { CUSTOM_ROUTE_AGRS_METADATA } from '../../constants';
import { createRouteParamDecorator } from '../../decorators/http/create-route-param-metadata.decorator';
import { expect } from 'chai';

describe('createRouteParamDecorator', () => {
  let key: any;
  let reflector: any;
  let result: any;

  beforeEach(() => {
    key = 'key';
    reflector = (data: any, req: any, res: any, next: any) => true;
    result = createRouteParamDecorator(reflector);
  });
  it('should return a function as a first element', () => {
    expect(result).to.be.a('function');
  });
});
