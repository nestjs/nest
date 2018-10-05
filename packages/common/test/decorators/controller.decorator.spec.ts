import { expect } from 'chai';
import { Controller } from '../../decorators/core/controller.decorator';

describe('@Controller', () => {
  const reflectedPath = 'test';

  @Controller(reflectedPath)
  class Test {}
  @Controller()
  class EmptyDecorator {}

  it('should enhance controller with expected path metadata', () => {
    const path = Reflect.getMetadata('path', Test);
    expect(path).to.be.eql(reflectedPath);
  });

  it('should set default path when no object passed as param', () => {
    const path = Reflect.getMetadata('path', EmptyDecorator);
    expect(path).to.be.eql('/');
  });
});
