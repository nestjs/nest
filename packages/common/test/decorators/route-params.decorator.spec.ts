import {
  RESPONSE_PASSTHROUGH_METADATA,
  ROUTE_ARGS_METADATA,
} from '../../constants.js';
import {
  assignMetadata,
  Body,
  HostParam,
  Param,
  Query,
  RawBody,
  Res,
  Search,
  UploadedFile,
  UploadedFiles,
} from '../../decorators/index.js';
import { RequestMethod } from '../../enums/request-method.enum.js';
import { RouteParamtypes } from '../../enums/route-paramtypes.enum.js';
import {
  All,
  Copy,
  Delete,
  Get,
  Lock,
  Mkcol,
  Move,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Propfind,
  Proppatch,
  Put,
  QueryMethod,
  Unlock,
} from '../../index.js';

describe('@Get', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.GET,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.GET,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Get(requestPath)
      public static test(@Param('id', ParseIntPipe) params) {}

      @Get(requestPathUsingArray)
      public static testUsingArray(@Param('id') params) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      Test.constructor,
      'test',
    );
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(args[`${RouteParamtypes.PARAM}:0`]).toEqual({
      index: 0,
      data: 'id',
      pipes: [ParseIntPipe],
    });
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Get()
      public static test() {}

      @Get([])
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Post', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.POST,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.POST,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Post(requestPath)
      public static test() {}

      @Post(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Post()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Post([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Delete', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.DELETE,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.DELETE,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Delete(requestPath)
      public static test(@Body() body) {}

      @Delete(requestPathUsingArray)
      public static testUsingArray(@Body() body) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Delete()
      public static test() {}

      @Delete([])
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@All', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.ALL,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.ALL,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @All(requestPath)
      public static test() {}

      @All(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @All()
      public static test() {}

      @All([])
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Put', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PUT,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.PUT,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Put(requestPath)
      public static test() {}

      @Put(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Put()
      public static test() {}

      @Put([])
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Patch', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PATCH,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.PATCH,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Patch(requestPath)
      public static test() {}

      @Patch(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Patch()
      public static test() {}

      @Patch([])
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Search', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.SEARCH,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.SEARCH,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Search(requestPath)
      public static test() {}

      @Search(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Search()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Search([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@QueryMethod', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.QUERY,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.QUERY,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @QueryMethod(requestPath)
      public static test() {}

      @QueryMethod(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @QueryMethod()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @QueryMethod([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('Inheritance', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.GET,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.GET,
  };

  it('should enhance subclass with expected request metadata', () => {
    class Parent {
      @Get(requestPath)
      public static test() {}

      @Get(requestPathUsingArray)
      public static testUsingArray() {}
    }

    class Test extends Parent {}

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });
});

describe('@PropFind', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PROPFIND,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.PROPFIND,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Propfind(requestPath)
      public static test() {}

      @Propfind(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Propfind()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Propfind([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@PropPatch', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.PROPPATCH,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.PROPPATCH,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Proppatch(requestPath)
      public static test() {}

      @Proppatch(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Proppatch()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Proppatch([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@MkCol', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.MKCOL,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.MKCOL,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Mkcol(requestPath)
      public static test() {}

      @Mkcol(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Mkcol()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Mkcol([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Copy', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.COPY,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.COPY,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Copy(requestPath)
      public static test() {}

      @Copy(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Copy()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Copy([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Move', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.MOVE,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.MOVE,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Move(requestPath)
      public static test() {}

      @Move(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Move()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Move([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Lock', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.LOCK,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.LOCK,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Lock(requestPath)
      public static test() {}

      @Lock(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Lock()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Lock([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Unlock', () => {
  const requestPath = 'test';
  const requestProps = {
    path: requestPath,
    method: RequestMethod.UNLOCK,
  };

  const requestPathUsingArray = ['foo', 'bar'];
  const requestPropsUsingArray = {
    path: requestPathUsingArray,
    method: RequestMethod.UNLOCK,
  };

  it('should enhance class with expected request metadata', () => {
    class Test {
      @Unlock(requestPath)
      public static test() {}

      @Unlock(requestPathUsingArray)
      public static testUsingArray() {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const method = Reflect.getMetadata('method', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);
    const methodUsingArray = Reflect.getMetadata('method', Test.testUsingArray);

    expect(path).toEqual(requestPath);
    expect(method).toEqual(requestProps.method);
    expect(pathUsingArray).toEqual(requestPathUsingArray);
    expect(methodUsingArray).toEqual(requestPropsUsingArray.method);
  });

  it('should set path on "/" by default', () => {
    class Test {
      @Unlock()
      public static test(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}

      @Unlock([])
      public static testUsingArray(
        @Query() query,
        @Param() params,
        @HostParam() hostParams,
      ) {}
    }

    const path = Reflect.getMetadata('path', Test.test);
    const pathUsingArray = Reflect.getMetadata('path', Test.testUsingArray);

    expect(path).toEqual('/');
    expect(pathUsingArray).toEqual('/');
  });
});

describe('@Body with ParameterDecoratorOptions', () => {
  const mockSchema = {
    '~standard': {
      version: 1 as const,
      vendor: 'test',
      validate: (v: unknown) => ({ value: v }),
    },
  };

  it('should enhance param with schema when options passed as the only argument', () => {
    class Test {
      public test(@Body({ schema: mockSchema }) body) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should enhance param with pipes when options with pipes passed as the only argument', () => {
    class Test {
      public test(@Body({ schema: mockSchema, pipes: [ParseIntPipe] }) body) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [ParseIntPipe],
      schema: mockSchema,
    });
  });

  it('should enhance param with schema when options passed as second argument with property', () => {
    class Test {
      public test(@Body('role', { schema: mockSchema }) body) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: 'role',
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should not confuse a pipe instance with options', () => {
    class Test {
      public test(@Body(new ParseIntPipe()) body) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key].data).toBeUndefined();
    expect(metadata[key].pipes).toHaveLength(1);
    expect(metadata[key].schema).toBeUndefined();
  });
});

describe('@Query with ParameterDecoratorOptions', () => {
  const mockSchema = {
    '~standard': {
      version: 1 as const,
      vendor: 'test',
      validate: (v: unknown) => ({ value: v }),
    },
  };

  it('should enhance param with schema when options passed as the only argument', () => {
    class Test {
      public test(@Query({ schema: mockSchema }) query) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should enhance param with pipes when options with pipes passed as the only argument', () => {
    class Test {
      public test(
        @Query({ schema: mockSchema, pipes: [ParseIntPipe] }) query,
      ) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [ParseIntPipe],
      schema: mockSchema,
    });
  });

  it('should enhance param with schema when options passed as second argument with property', () => {
    class Test {
      public test(@Query('user', { schema: mockSchema }) user) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: 'user',
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should not confuse a pipe instance with options', () => {
    class Test {
      public test(@Query(new ParseIntPipe()) query) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key].data).toBeUndefined();
    expect(metadata[key].pipes).toHaveLength(1);
    expect(metadata[key].schema).toBeUndefined();
  });
});

describe('@Param with ParameterDecoratorOptions', () => {
  const mockSchema = {
    '~standard': {
      version: 1 as const,
      vendor: 'test',
      validate: (v: unknown) => ({ value: v }),
    },
  };

  it('should enhance param with schema when options passed as the only argument', () => {
    class Test {
      public test(@Param({ schema: mockSchema }) params) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should enhance param with pipes when options with pipes passed as the only argument', () => {
    class Test {
      public test(
        @Param({ schema: mockSchema, pipes: [ParseIntPipe] }) params,
      ) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [ParseIntPipe],
      schema: mockSchema,
    });
  });

  it('should enhance param with schema when options passed as second argument with property', () => {
    class Test {
      public test(@Param('id', { schema: mockSchema }) id) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: 'id',
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should not confuse a pipe instance with options', () => {
    class Test {
      public test(@Param(new ParseIntPipe()) params) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key].data).toBeUndefined();
    expect(metadata[key].pipes).toHaveLength(1);
    expect(metadata[key].schema).toBeUndefined();
  });
});

describe('@Res', () => {
  it('should enhance param with response metadata', () => {
    class Test {
      public test(@Res() res) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.RESPONSE}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
    });
    expect(
      Reflect.getMetadata(RESPONSE_PASSTHROUGH_METADATA, Test, 'test'),
    ).toBeUndefined();
  });

  it('should enable passthrough when "passthrough" option is true', () => {
    class Test {
      public test(@Res({ passthrough: true }) res) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.RESPONSE}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
    });
    expect(
      Reflect.getMetadata(RESPONSE_PASSTHROUGH_METADATA, Test, 'test'),
    ).toBe(true);
  });
});

describe('@UploadedFile', () => {
  it('should enhance param with file metadata', () => {
    class Test {
      public test(@UploadedFile() file) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.FILE}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
    });
  });

  it('should enhance param with file key and pipes', () => {
    class Test {
      public test(@UploadedFile('avatar', ParseFilePipe) file) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.FILE}:0`]).toEqual({
      index: 0,
      data: 'avatar',
      pipes: [ParseFilePipe],
    });
  });

  it('should not confuse a pipe passed as the first argument with a file key', () => {
    const pipe = new ParseFilePipe();
    class Test {
      public test(@UploadedFile(pipe) file) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.FILE}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [pipe],
    });
  });
});

describe('@UploadedFiles', () => {
  it('should enhance param with files metadata', () => {
    class Test {
      public test(@UploadedFiles() files) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.FILES}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
    });
  });

  it('should enhance param with pipes', () => {
    const pipe = new ParseFilePipe();
    class Test {
      public test(@UploadedFiles(pipe) files) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.FILES}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [pipe],
    });
  });
});

describe('@RawBody', () => {
  const mockSchema = {
    '~standard': {
      version: 1 as const,
      vendor: 'test',
      validate: (v: unknown) => ({ value: v }),
    },
  };

  it('should enhance param with raw body metadata', () => {
    class Test {
      public test(@RawBody() rawBody) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.RAW_BODY}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
    });
  });

  it('should not confuse a pipe instance with options', () => {
    const pipe = new ParseIntPipe();
    class Test {
      public test(@RawBody(pipe) rawBody) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.RAW_BODY}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [pipe],
    });
  });

  it('should enhance param with schema when options passed as the only argument', () => {
    class Test {
      public test(@RawBody({ schema: mockSchema }) rawBody) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.RAW_BODY}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should enhance param with pipes when options with pipes passed as the only argument', () => {
    class Test {
      public test(
        @RawBody({ schema: mockSchema, pipes: [ParseIntPipe] }) rawBody,
      ) {}
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    expect(metadata[`${RouteParamtypes.RAW_BODY}:0`]).toEqual({
      index: 0,
      data: undefined,
      pipes: [ParseIntPipe],
      schema: mockSchema,
    });
  });
});

describe('assignMetadata', () => {
  describe('when called with the legacy positional signature', () => {
    it('should use a non-object argument as data', () => {
      expect(assignMetadata({}, RouteParamtypes.BODY, 0, 'role')).toEqual({
        [`${RouteParamtypes.BODY}:0`]: { index: 0, data: 'role', pipes: [] },
      });
    });

    it('should not read an object argument as options when pipes are passed positionally', () => {
      const data = { data: 'role' };
      expect(
        assignMetadata({}, RouteParamtypes.BODY, 0, data, ParseIntPipe),
      ).toEqual({
        [`${RouteParamtypes.BODY}:0`]: {
          index: 0,
          data,
          pipes: [ParseIntPipe],
        },
      });
    });
  });
});
