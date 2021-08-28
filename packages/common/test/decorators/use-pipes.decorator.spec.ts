import { PIPES_METADATA } from '../../constants';
import { UsePipes } from '../../decorators/core/use-pipes.decorator';
import { InvalidDecoratorItemException } from '../../utils/validate-each.util';

class Pipe {
  transform() {}
}

describe('@UsePipes', () => {
  const pipes = [new Pipe(), new Pipe()];

  @UsePipes(...pipes)
  class Test {}

  class TestWithMethod {
    @UsePipes(...pipes)
    public static test() {}
  }

  it('should enhance class with expected pipes array', () => {
    const metadata = Reflect.getMetadata(PIPES_METADATA, Test);
    expect(metadata).toEqual(pipes);
  });

  it('should enhance method with expected pipes array', () => {
    const metadata = Reflect.getMetadata(PIPES_METADATA, TestWithMethod.test);
    expect(metadata).toEqual(pipes);
  });

  it('when object is invalid should throw exception', () => {
    try {
      UsePipes('test' as any)(() => {});
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidDecoratorItemException);
    }
  });
});
