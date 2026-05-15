import { optionalRequire } from '../../helpers/optional-require.js';

describe('optionalRequire', () => {
  it('should return the module when import succeeds', async () => {
    const result = await optionalRequire('path');
    expect(result).toBeDefined();
    expect(
      typeof result.resolve === 'function' || typeof result.join === 'function',
    ).toBe(true);
  });

  it('should return empty object when package does not exist', async () => {
    const result = await optionalRequire('non-existent-package-xyz-123');
    expect(result).toEqual({});
  });

  it('should use loaderFn when provided', async () => {
    const mockModule = { myFn: () => 42 };
    const loaderFn = vi.fn().mockResolvedValue(mockModule);
    const result = await optionalRequire('anything', loaderFn);
    expect(result).toBe(mockModule);
    expect(loaderFn).toHaveBeenCalledOnce();
  });

  it('should return empty object when loaderFn throws', async () => {
    const loaderFn = vi.fn().mockRejectedValue(new Error('load failed'));
    const result = await optionalRequire('anything', loaderFn);
    expect(result).toEqual({});
  });

  it('should not call loaderFn if not provided', async () => {
    // Just verify it doesn't throw with a valid package and no loaderFn
    const result = await optionalRequire('fs');
    expect(result).toBeDefined();
  });
});
