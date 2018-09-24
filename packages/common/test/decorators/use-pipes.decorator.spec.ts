import 'reflect-metadata';
import { expect } from 'chai';
import { UsePipes } from '@nestjs/common/decorators/core/use-pipes.decorator';
import { PIPES_METADATA } from '@nestjs/common/constants';
import { InvalidDecoratorItemException } from '@nestjs/common/utils/validate-each.util';

class Pipe {
  transform() {}
}

describe('@UsePipes', () => {
  const pipes = [new Pipe(), new Pipe()];

  @UsePipes(...(pipes as any))
  class Test {}

  class TestWithMethod {
    @UsePipes(...(pipes as any))
    public static test() {}
  }

  it('should enhance class with expected pipes array', () => {
    const metadata = Reflect.getMetadata(PIPES_METADATA, Test);
    expect(metadata).to.be.eql(pipes);
  });

  it('should enhance method with expected pipes array', () => {
    const metadata = Reflect.getMetadata(PIPES_METADATA, TestWithMethod.test);
    expect(metadata).to.be.eql(pipes);
  });

  it('when object is invalid should throw exception', () => {
    try {
      UsePipes('test' as any)({});
    } catch (e) {
      expect(e).to.be.instanceof(InvalidDecoratorItemException);
    }
  });
});
