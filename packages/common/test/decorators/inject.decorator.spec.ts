import { SELF_DECLARED_DEPS_METADATA } from '../../constants.js';
import { Inject } from '../../index.js';

describe('@Inject', () => {
  const opaqueToken = () => ({});
  class Test {
    constructor(
      @Inject('test') param,
      @Inject('test2') param2,
      @Inject(opaqueToken) param3,
    ) {}
  }

  it('should enhance class with expected constructor params metadata', () => {
    const metadata = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, Test);

    const expectedMetadata = [
      { index: 2, param: opaqueToken },
      { index: 1, param: 'test2' },
      { index: 0, param: 'test' },
    ];
    expect(metadata).toEqual(expectedMetadata);
  });

  describe('when used on a constructor parameter without a token', () => {
    class Dependency {}

    class TestWithInferredToken {
      constructor(@Inject() param: Dependency) {}
    }

    class TestWithUndefinedToken {
      constructor(@Inject(undefined) param: Dependency) {}
    }

    it('should infer the token from the parameter type when called without arguments', () => {
      const metadata = Reflect.getMetadata(
        SELF_DECLARED_DEPS_METADATA,
        TestWithInferredToken,
      );
      expect(metadata).toEqual([{ index: 0, param: Dependency }]);
    });

    it('should not infer the token when an explicit undefined token is passed', () => {
      const metadata = Reflect.getMetadata(
        SELF_DECLARED_DEPS_METADATA,
        TestWithUndefinedToken,
      );
      expect(metadata).toEqual([{ index: 0, param: undefined }]);
    });
  });
});
