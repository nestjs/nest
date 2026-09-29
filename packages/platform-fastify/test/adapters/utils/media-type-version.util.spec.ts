import { extractVersionFromAcceptHeader } from '../../../adapters/utils/media-type-version.util.js';

describe('extractVersionFromAcceptHeader', () => {
  it('should read the version parameter of a single media type', () => {
    expect(extractVersionFromAcceptHeader('application/json;v=2', 'v=')).toBe(
      '2',
    );
    expect(extractVersionFromAcceptHeader('application/json; v=2', 'v=')).toBe(
      '2',
    );
  });

  it('should read the version regardless of its position among the parameters', () => {
    expect(
      extractVersionFromAcceptHeader('application/json;q=0.9;v=2', 'v='),
    ).toBe('2');
    expect(
      extractVersionFromAcceptHeader(
        'application/json;charset=utf-8;v=3;q=0.8',
        'v=',
      ),
    ).toBe('3');
  });

  it('should read the version from a list of media types', () => {
    expect(
      extractVersionFromAcceptHeader(
        'text/html, application/json;v=2, */*;q=0.1',
        'v=',
      ),
    ).toBe('2');
    expect(
      extractVersionFromAcceptHeader(
        ['text/html', 'application/json;v=1'],
        'v=',
      ),
    ).toBe('1');
  });

  it('should honor a custom key', () => {
    expect(
      extractVersionFromAcceptHeader('application/json;version=4', 'version='),
    ).toBe('4');
  });

  it('should return undefined when no version parameter is present', () => {
    expect(extractVersionFromAcceptHeader(undefined, 'v=')).toBeUndefined();
    expect(extractVersionFromAcceptHeader('', 'v=')).toBeUndefined();
    expect(
      extractVersionFromAcceptHeader('application/json', 'v='),
    ).toBeUndefined();
    expect(
      extractVersionFromAcceptHeader('application/json;q=0.9', 'v='),
    ).toBeUndefined();
    expect(
      extractVersionFromAcceptHeader('application/json;version=2', 'v='),
    ).toBeUndefined();
  });
});
