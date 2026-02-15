import { Logger } from '@nestjs/common';
import { loadAdapter } from '../../helpers/load-adapter.js';

describe('loadAdapter', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the module when import succeeds', async () => {
    const result = await loadAdapter('path', 'TestTransport');
    expect(result).toBeDefined();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should use loaderFn when provided', async () => {
    const fakeModule = { adapter: true };
    const loaderFn = vi.fn().mockResolvedValue(fakeModule);

    const result = await loadAdapter('anything', 'TestTransport', loaderFn);
    expect(result).toBe(fakeModule);
    expect(loaderFn).toHaveBeenCalledOnce();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should log error and exit when import fails', async () => {
    await loadAdapter('nonexistent-package-xyz', 'TestTransport');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No driver (TestTransport) has been selected'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should log error and exit when loaderFn throws', async () => {
    const loaderFn = vi.fn().mockRejectedValue(new Error('boom'));

    await loadAdapter('anything', 'TestTransport', loaderFn);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No driver (TestTransport) has been selected'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should include install instruction in error message', async () => {
    const loaderFn = vi.fn().mockRejectedValue(new Error('boom'));

    await loadAdapter('@nestjs/platform-express', 'HTTP', loaderFn);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('$ npm install @nestjs/platform-express'),
    );
  });
});
