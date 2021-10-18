import { expect } from 'chai';
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
    expect(factory.get(target, RequestMethod.DELETE)).to.equal(target.delete);
    expect(factory.get(target, RequestMethod.POST)).to.equal(target.post);
    expect(factory.get(target, RequestMethod.ALL)).to.equal(target.all);
    expect(factory.get(target, RequestMethod.PUT)).to.equal(target.put);
    expect(factory.get(target, RequestMethod.GET)).to.equal(target.get);
    expect(factory.get(target, RequestMethod.PATCH)).to.equal(target.patch);
    expect(factory.get(target, RequestMethod.OPTIONS)).to.equal(target.options);
    expect(factory.get(target, RequestMethod.HEAD)).to.equal(target.head);
    expect(factory.get(target, -1)).to.equal(target.use);
  });
});
