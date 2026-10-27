import { PARAM_ARGS_METADATA } from '../../constants.js';
import { Payload } from '../../decorators/index.js';

// `@nestjs/common` exports getParamArgsMetadata() since 12.3.0, while this
// package supports `@nestjs/common` ^12.0.0. Mock it as an older one.
vi.mock('../../../common/internal.js', async importOriginal => {
  const { getParamArgsMetadata, ...internal } =
    await importOriginal<typeof import('@nestjs/common/internal')>();
  return internal;
});

describe('param decorators with an @nestjs/common older than 12.3.0', () => {
  it('should keep one param per argument in an overriding method', () => {
    class Parent {
      public test(@Payload('parent') data: any) {}
    }
    class Test extends Parent {
      public test(@Payload('child') data: any) {}
    }

    const argsMetadata = Reflect.getMetadata(PARAM_ARGS_METADATA, Test, 'test');
    expect(Object.values(argsMetadata)).toEqual([
      expect.objectContaining({ index: 0, data: 'child' }),
    ]);
  });
});
