import 'reflect-metadata';
import { expect } from 'chai';
import { RequestMethod } from '../../enums/request-method.enum';
import { Get, Post, Delete, All, Put, Patch } from '../../index';

describe('@Get', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.GET
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Get(requestPath)
      public static test() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);

    expect(method).to.be.eql(requestProps.method);
    expect(path).to.be.eql(requestPath);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Get()
      public static test() {}
    }
    const path = Reflect.getMetadata('path', Test.test);
    expect(path).to.be.eql('/');
  });
});

describe('@Post', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.POST
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Post(requestPath)
      public static test() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);

    expect(method).to.be.eql(requestProps.method);
    expect(path).to.be.eql(requestPath);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Post()
      public static test() {}
    }
    const path = Reflect.getMetadata('path', Test.test);
    expect(path).to.be.eql('/');
  });
});

describe('@Delete', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.DELETE
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Delete(requestPath)
      public static test() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);

    expect(method).to.be.eql(requestProps.method);
    expect(path).to.be.eql(requestPath);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Delete()
      public static test() {}
    }
    const path = Reflect.getMetadata('path', Test.test);
    expect(path).to.be.eql('/');
  });
});

describe('@All', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.ALL
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @All(requestPath)
      public static test() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);

    expect(method).to.be.eql(requestProps.method);
    expect(path).to.be.eql(requestPath);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @All()
      public static test() {}
    }
    const path = Reflect.getMetadata('path', Test.test);
    expect(path).to.be.eql('/');
  });
});

describe('@Put', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PUT
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Put(requestPath)
      public static test() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);

    expect(method).to.be.eql(requestProps.method);
    expect(path).to.be.eql(requestPath);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Put()
      public static test() {}
    }
    const path = Reflect.getMetadata('path', Test.test);
    expect(path).to.be.eql('/');
  });
});

describe('@Patch', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PATCH
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Patch(requestPath)
      public static test() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);

    expect(method).to.be.eql(requestProps.method);
    expect(path).to.be.eql(requestPath);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Patch()
      public static test() {}
    }
    const path = Reflect.getMetadata('path', Test.test);
    expect(path).to.be.eql('/');
  });
});
