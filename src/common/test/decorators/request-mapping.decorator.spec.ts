import 'reflect-metadata';
import { expect } from 'chai';
import { RequestMapping } from '../../decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../enums/request-method.enum';

describe('@RequestMapping', () => {
  const requestProps = {
    path: 'test',
    method: RequestMethod.ALL
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @RequestMapping(requestProps)
      public static test() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);

    expect(method).to.be.eql(requestProps.method);
    expect(path).to.be.eql(requestProps.path);
  });

  it('should set request method on GET by default', () => {
    class Test {
      @RequestMapping({ path: '' })
      public static test() {}
    }

    const method = Reflect.getMetadata('method', Test.test);
    expect(method).to.be.eql(RequestMethod.GET);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @RequestMapping({})
      public static test() {}
    }

    const method = Reflect.getMetadata('path', Test.test);
    expect(method).to.be.eql('/');
  });
});
