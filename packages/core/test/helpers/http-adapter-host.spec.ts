import { firstValueFrom } from 'rxjs';
import { HttpAdapterHost } from '../../helpers/http-adapter-host.js';

describe('HttpAdapterHost', () => {
  let host: HttpAdapterHost;

  beforeEach(() => {
    host = new HttpAdapterHost();
  });

  describe('httpAdapter accessors', () => {
    it('should return undefined when no adapter is set', () => {
      expect(host.httpAdapter).toBeUndefined();
    });

    it('should store and retrieve the adapter', () => {
      const adapter = { name: 'express' } as any;
      host.httpAdapter = adapter;

      expect(host.httpAdapter).toBe(adapter);
    });
  });

  describe('init$', () => {
    it('should emit when httpAdapter is set', async () => {
      const promise = firstValueFrom(host.init$);

      host.httpAdapter = { name: 'express' } as any;

      await expect(promise).resolves.toBeUndefined();
    });

    it('should replay to late subscribers', async () => {
      host.httpAdapter = { name: 'express' } as any;

      // Subscribe after the adapter was already set
      const result = await firstValueFrom(host.init$);
      expect(result).toBeUndefined();
    });
  });

  describe('listening accessors', () => {
    it('should default to false', () => {
      expect(host.listening).toBe(false);
    });

    it('should update when set to true', () => {
      host.listening = true;
      expect(host.listening).toBe(true);
    });
  });

  describe('listen$', () => {
    it('should emit when listening is set to true', async () => {
      const promise = firstValueFrom(host.listen$);

      host.listening = true;

      await expect(promise).resolves.toBeUndefined();
    });

    it('should not emit when listening is set to false', () => {
      let emitted = false;
      host.listen$.subscribe(() => {
        emitted = true;
      });

      host.listening = false;

      expect(emitted).toBe(false);
    });
  });
});
