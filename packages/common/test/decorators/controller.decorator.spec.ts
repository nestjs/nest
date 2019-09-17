import { expect } from 'chai';
import { Controller } from '../../decorators/core/controller.decorator';

describe('@Controller', () => {
  const reflectedPath = 'test';
  const reflectedHost = 'api.example.com';

  @Controller(reflectedPath)
  class Test {}

  @Controller()
  class EmptyDecorator {}

  @Controller({ path: reflectedPath, host: reflectedHost })
  class PathAndHostDecorator {}

  @Controller({ host: reflectedHost })
  class HostOnlyDecorator {}

  it('should enhance controller with expected path metadata', () => {
    const path = Reflect.getMetadata('path', Test);
    expect(path).to.be.eql(reflectedPath);
    const path2 = Reflect.getMetadata('path', PathAndHostDecorator);
    expect(path2).to.be.eql(reflectedPath);
  });

  it('should enhance controller with expected host metadata', () => {
    const host = Reflect.getMetadata('host', PathAndHostDecorator);
    expect(host).to.be.eql(reflectedHost);
    const host2 = Reflect.getMetadata('host', HostOnlyDecorator);
    expect(host2).to.be.eql(reflectedHost);
  });

  it('should set default path when no object passed as param', () => {
    const path = Reflect.getMetadata('path', EmptyDecorator);
    expect(path).to.be.eql('/');
    const path2 = Reflect.getMetadata('path', HostOnlyDecorator);
    expect(path2).to.be.eql('/');
  });

  it('should not set host when no host passed as param', () => {
    const host = Reflect.getMetadata('host', Test);
    expect(host).to.be.undefined;
    const host2 = Reflect.getMetadata('host', EmptyDecorator);
    expect(host2).to.be.undefined;
  });
});
