import { RequestMethod } from '../../../common/enums/request-method.enum';
import { RouterMethodFactory } from '../../helpers/router-method-factory';

describe('RouterMethodFactory', () => {
  let factory: RouterMethodFactory;

  const target: any = {
    get: () => {},
    post: () => {},
    use: () => {},
    delete: () => {},
    put: () => {},
    patch: () => {},
    options: () => {},
    head: () => {},
    all: () => {},
  };
  beforeEach(() => {
    factory = new RouterMethodFactory();
  });

  it('should return proper method', () => {
    expect(factory.get(target, RequestMethod.DELETE)).toEqual(target.delete);
    expect(factory.get(target, RequestMethod.POST)).toEqual(target.post);
    expect(factory.get(target, RequestMethod.ALL)).toEqual(target.all);
    expect(factory.get(target, RequestMethod.PUT)).toEqual(target.put);
    expect(factory.get(target, RequestMethod.GET)).toEqual(target.get);
    expect(factory.get(target, RequestMethod.PATCH)).toEqual(target.patch);
    expect(factory.get(target, RequestMethod.OPTIONS)).toEqual(target.options);
    expect(factory.get(target, RequestMethod.HEAD)).toEqual(target.head);
    expect(factory.get(target, -1)).toEqual(target.use);
  });
});
