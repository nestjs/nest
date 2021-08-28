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

    expect(path).toEqual(requestProps.path);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPropsUsingArray.path);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set request method on GET by default', () => {
    class Test {
      @RequestMapping({ path: '' })
      public static test() {}
    }

    const method = Reflect.getMetadata('method', Test.test);

    expect(method).toEqual(RequestMethod.GET);
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

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});
