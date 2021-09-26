import { expect } from 'chai';
import { VERSION_METADATA } from '../../constants';
import { Controller } from '../../decorators/core/controller.decorator';

describe('@Controller', () => {
  const reflectedPath = 'test';
  const reflectedHost = 'api.example.com';
  const reflectedHostArray = ['api1.example.com', 'api2.example.com'];
  const reflectedVersion = '1';

  @Controller(reflectedPath)
  class Test {}

  @Controller()
  class EmptyDecorator {}

  @Controller({ path: reflectedPath, host: reflectedHost })
  class PathAndHostDecorator {}

  @Controller({ path: reflectedPath, host: reflectedHostArray })
  class PathAndHostArrayDecorator {}

  @Controller({ host: reflectedHost })
  class HostOnlyDecorator {}

  @Controller({
    path: reflectedPath,
    host: reflectedHost,
    version: reflectedVersion,
  })
  class PathAndHostAndVersionDecorator {}

  @Controller({ version: reflectedVersion })
  class VersionOnlyDecorator {}

  it('should enhance controller with expected path metadata', () => {
    const path = Reflect.getMetadata('path', Test);
    expect(path).to.be.eql(reflectedPath);
    const path2 = Reflect.getMetadata('path', PathAndHostDecorator);
    expect(path2).to.be.eql(reflectedPath);
    const path3 = Reflect.getMetadata('path', PathAndHostAndVersionDecorator);
    expect(path3).to.be.eql(reflectedPath);
  });

  it('should enhance controller with expected host metadata', () => {
    const host = Reflect.getMetadata('host', PathAndHostDecorator);
    expect(host).to.be.eql(reflectedHost);
    const host2 = Reflect.getMetadata('host', HostOnlyDecorator);
    expect(host2).to.be.eql(reflectedHost);
    const host3 = Reflect.getMetadata('host', PathAndHostArrayDecorator);
    expect(host3).to.be.eql(reflectedHostArray);
    const host4 = Reflect.getMetadata('host', PathAndHostAndVersionDecorator);
    expect(host4).to.be.eql(reflectedHost);
  });

  it('should enhance controller with expected version metadata', () => {
    const version = Reflect.getMetadata(
      VERSION_METADATA,
      PathAndHostAndVersionDecorator,
    );
    expect(version).to.be.eql(reflectedVersion);
    const version2 = Reflect.getMetadata(
      VERSION_METADATA,
      VersionOnlyDecorator,
    );
    expect(version2).to.be.eql(reflectedVersion);
  });

  it('should set default path when no object passed as param', () => {
    const path = Reflect.getMetadata('path', EmptyDecorator);
    expect(path).to.be.eql('/');
    const path2 = Reflect.getMetadata('path', HostOnlyDecorator);
    expect(path2).to.be.eql('/');
    const path3 = Reflect.getMetadata('path', VersionOnlyDecorator);
    expect(path3).to.be.eql('/');
  });

  it('should not set host when no host passed as param', () => {
    const host = Reflect.getMetadata('host', Test);
    expect(host).to.be.undefined;
    const host2 = Reflect.getMetadata('host', EmptyDecorator);
    expect(host2).to.be.undefined;
  });

  it('should not set version when no version passed as param', () => {
    const version = Reflect.getMetadata(VERSION_METADATA, Test);
    expect(version).to.be.undefined;
    const version2 = Reflect.getMetadata(VERSION_METADATA, EmptyDecorator);
    expect(version2).to.be.undefined;
  });
});
