import { expect } from 'chai';
import { RequestMapping } from '../../decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../enums/request-method.enum';

describe('@RequestMapping', () => {
  const requestProps = {
    path: 'test',
    method: RequestMethod.ALL,
  };

  const requestPropsUsingArray = {
    path: ['foo', 'bar'],
    method: RequestMethod.ALL,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @RequestMapping(requestProps)
      public static test() {}

      @RequestMapping(requestPropsUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).to.be.eql(requestProps.path);
    expect(method).to.be.eql(requestProps.method);
    expect(pathUsingArray).to.be.eql(requestPropsUsingArray.path);
    expect(methodUsingArray).to.be.eql(requestPropsUsingArray.method);
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

      @RequestMapping({ path: [] })
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).to.be.eql('/');
    expect(pathUsingArray).to.be.eql('/');
  });
});
