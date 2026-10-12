import { getMediaTypeVersion } from '../../../adapters/utils/get-media-type-version.util.js';

describe('getMediaTypeVersion', () => {
  it.each([
    ['application/json;v=2', '2'],
    ['application/json; v=2', '2'],
    ['application/json;q=0.9;v=2', '2'],
    ['application/json;charset=utf-8; v=3 ;q=0.8', '3'],
    ['text/html, application/json;v=2, */*;q=0.1', '2'],
    ['application/json;v=1, application/json;v=2', '1'],
    [['text/html', 'application/json;v=4'], '4'],
  ])('should read the version from "%s"', (acceptHeader, expected) => {
    expect(getMediaTypeVersion(acceptHeader, 'v=')).toBe(expected);
  });

  it.each([
    undefined,
    '',
    'application/json',
    'application/json;q=0.9',
    'application/json;version=2',
    'application/v=2',
  ])('should return undefined for "%s"', acceptHeader => {
    expect(getMediaTypeVersion(acceptHeader, 'v=')).toBeUndefined();
  });

  it('should use the configured key', () => {
    expect(
      getMediaTypeVersion('application/json;v=1;version=4', 'version='),
    ).toBe('4');
  });
});
