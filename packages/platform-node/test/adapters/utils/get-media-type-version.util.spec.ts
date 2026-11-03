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
    ['application/json;v="2"', '2'],
    ['application/json;v=', ''],
    ['application/json;v=""', ''],
    ['application/json; v="3" ;q=0.8', '3'],
    ['application/json;note="a;v=999";v=2', '2'],
    ['text/html;note="a,application/json;v=999", application/json;v=2', '2'],
    ['application/json;note="a\\";v=999";v=2', '2'],
    ['application/json;note="a\\\\";v=2', '2'],
    ['application/json;v="beta;next,2"', 'beta;next,2'],
    ['application/json;v="\\2"', '2'],
    ['application/json;v="a\\"b\\\\c"', 'a"b\\c'],
    ['application/json;v="1", application/json;v=2', '1'],
    [['text/html;note="a;v=999"', 'application/json;v="4"'], '4'],
    [['application/json;note="unterminated', 'application/json;v="4"'], '4'],
    [['application/json;v="4"', 'application/json;note="unterminated'], '4'],
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
    'application/json;note="a;v=2"',
    'text/html;note="a,application/json;v=2"',
  ])('should return undefined for "%s"', acceptHeader => {
    expect(getMediaTypeVersion(acceptHeader, 'v=')).toBeUndefined();
  });

  it.each([
    'application/json;v=1;version=4',
    'application/json;v=1;version="4"',
    'application/json;note="a;version=999";version="4"',
  ])('should use the configured key in "%s"', acceptHeader => {
    expect(getMediaTypeVersion(acceptHeader, 'version=')).toBe('4');
  });

  it.each([
    'application/json;note="a;v=2',
    'text/html;note="a,application/json;v=2',
    'application/json;note="a\\";v=2',
    'application/json;note="a\\',
  ])(
    'should not read a version after an unterminated quote: %s',
    acceptHeader => {
      expect(getMediaTypeVersion(acceptHeader, 'v=')).toBeUndefined();
    },
  );

  it.each([
    'application/json;v=2;note="unterminated',
    'application/json;v=2, text/html;note="unterminated',
  ])('should read a version before an unterminated quote: %s', acceptHeader => {
    expect(getMediaTypeVersion(acceptHeader, 'v=')).toBe('2');
  });

  it('should keep an unterminated quoted version as is', () => {
    expect(getMediaTypeVersion('application/json;v="2', 'v=')).toBe('"2');
  });

  it('should ignore a long unterminated quoted value with escaped quotes', () => {
    const acceptHeader =
      'application/json;note="' + '\\"'.repeat(8000) + ';v=2';
    expect(getMediaTypeVersion(acceptHeader, 'v=')).toBeUndefined();
  });
});
