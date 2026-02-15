import { VERSION_METADATA } from '../../constants.js';
import { Version } from '../../decorators/core/version.decorator.js';

describe('@Version', () => {
  const version = '1';
  const versions = ['1', '2', '2', '1', '2', '1'];
  const versionsWithoutDuplicates = ['1', '2'];

  class Test {
    @Version(version)
    public static oneVersion() {}

    @Version(versions)
    public static multipleVersions() {}
  }

  it('should enhance method with expected version string', () => {
    const metadata = Reflect.getMetadata(VERSION_METADATA, Test.oneVersion);
    expect(metadata).toEqual(version);
  });

  it('should enhance method with expected version array', () => {
    const metadata = Reflect.getMetadata(
      VERSION_METADATA,
      Test.multipleVersions,
    );
    expect(metadata).toEqual(versionsWithoutDuplicates);
  });
});
