import { RequestMethod } from '../../../common/enums/request-method.enum.js';
import { RouterMethodFactory } from '../../helpers/router-method-factory.js';

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
    propfind: () => {},
    proppatch: () => {},
    mkcol: () => {},
    copy: () => {},
    move: () => {},
    lock: () => {},
    unlock: () => {},
    all: () => {},
  };
  beforeEach(() => {
    factory = new RouterMethodFactory();
  });

  it('should return proper method', () => {
    expect(factory.get(target, RequestMethod.DELETE)).toBe(target.delete);
    expect(factory.get(target, RequestMethod.POST)).toBe(target.post);
    expect(factory.get(target, RequestMethod.ALL)).toBe(target.all);
    expect(factory.get(target, RequestMethod.PUT)).toBe(target.put);
    expect(factory.get(target, RequestMethod.GET)).toBe(target.get);
    expect(factory.get(target, RequestMethod.PATCH)).toBe(target.patch);
    expect(factory.get(target, RequestMethod.OPTIONS)).toBe(target.options);
    expect(factory.get(target, RequestMethod.HEAD)).toBe(target.head);
    expect(factory.get(target, RequestMethod.PROPFIND)).toBe(target.propfind);
    expect(factory.get(target, RequestMethod.PROPPATCH)).toBe(target.proppatch);
    expect(factory.get(target, RequestMethod.MKCOL)).toBe(target.mkcol);
    expect(factory.get(target, RequestMethod.COPY)).toBe(target.copy);
    expect(factory.get(target, RequestMethod.MOVE)).toBe(target.move);
    expect(factory.get(target, RequestMethod.LOCK)).toBe(target.lock);
    expect(factory.get(target, RequestMethod.UNLOCK)).toBe(target.unlock);
    expect(factory.get(target, -1 as any)).toBe(target.use);
  });
});
