import { VERSION_METADATA, CONTROLLER_WATERMARK } from '../../constants.js';
import { Controller } from '../../decorators/core/controller.decorator.js';

describe('@Controller', () => {
  const reflectedPath = 'test';
  const reflectedHost = 'api.example.com';
  const reflectedHostArray = ['api1.example.com', 'api2.example.com'];
  const reflectedVersion = '1';
  const reflectedVersionWithDuplicates = ['1', '2', '2', '1', '2', '1'];
  const reflectedVersionWithoutDuplicates = ['1', '2'];

  @Controller()
  class EmptyDecorator {}

  @Controller(reflectedPath)
  class Test {}

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

  @Controller({ version: reflectedVersionWithDuplicates })
  class VersionOnlyArrayDecorator {}

  it(`should enhance component with "${CONTROLLER_WATERMARK}" metadata`, () => {
    const controllerWatermark = Reflect.getMetadata(
      CONTROLLER_WATERMARK,
      EmptyDecorator,
    );

    expect(controllerWatermark).toBe(true);
  });

  it('should enhance controller with expected path metadata', () => {
    const path = Reflect.getMetadata('path', Test);
    expect(path).toEqual(reflectedPath);
    const path2 = Reflect.getMetadata('path', PathAndHostDecorator);
    expect(path2).toEqual(reflectedPath);
    const path3 = Reflect.getMetadata('path', PathAndHostAndVersionDecorator);
    expect(path3).toEqual(reflectedPath);
  });

  it('should enhance controller with expected host metadata', () => {
    const host = Reflect.getMetadata('host', PathAndHostDecorator);
    expect(host).toEqual(reflectedHost);
    const host2 = Reflect.getMetadata('host', HostOnlyDecorator);
    expect(host2).toEqual(reflectedHost);
    const host3 = Reflect.getMetadata('host', PathAndHostArrayDecorator);
    expect(host3).toEqual(reflectedHostArray);
    const host4 = Reflect.getMetadata('host', PathAndHostAndVersionDecorator);
    expect(host4).toEqual(reflectedHost);
  });

  it('should enhance controller with expected version metadata', () => {
    const version = Reflect.getMetadata(
      VERSION_METADATA,
      PathAndHostAndVersionDecorator,
    );
    expect(version).toEqual(reflectedVersion);
    const version2 = Reflect.getMetadata(
      VERSION_METADATA,
      VersionOnlyDecorator,
    );
    expect(version2).toEqual(reflectedVersion);
    const version3 = Reflect.getMetadata(
      VERSION_METADATA,
      VersionOnlyArrayDecorator,
    );
    expect(version3).toEqual(reflectedVersionWithoutDuplicates);
  });

  it('should set default path when no object passed as param', () => {
    const path = Reflect.getMetadata('path', EmptyDecorator);
    expect(path).toEqual('/');
    const path2 = Reflect.getMetadata('path', HostOnlyDecorator);
    expect(path2).toEqual('/');
    const path3 = Reflect.getMetadata('path', VersionOnlyDecorator);
    expect(path3).toEqual('/');
  });

  it('should not set host when no host passed as param', () => {
    const host = Reflect.getMetadata('host', Test);
    expect(host).toBeUndefined();
    const host2 = Reflect.getMetadata('host', EmptyDecorator);
    expect(host2).toBeUndefined();
  });

  it('should not set version when no version passed as param', () => {
    const version = Reflect.getMetadata(VERSION_METADATA, Test);
    expect(version).toBeUndefined();
    const version2 = Reflect.getMetadata(VERSION_METADATA, EmptyDecorator);
    expect(version2).toBeUndefined();
  });
});
