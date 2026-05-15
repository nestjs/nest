import { firstValueFrom } from 'rxjs';
import { ModulesContainer } from '../../injector/modules-container.js';

describe('ModulesContainer', () => {
  let container: ModulesContainer;

  beforeEach(() => {
    container = new ModulesContainer();
  });

  describe('applicationId', () => {
    it('should return a string identifier', () => {
      expect(typeof container.applicationId).toBe('string');
    });

    it('should return the same id on subsequent calls', () => {
      expect(container.applicationId).toBe(container.applicationId);
    });

    it('should return different ids for different containers', () => {
      const container2 = new ModulesContainer();
      expect(container.applicationId).not.toBe(container2.applicationId);
    });
  });

  describe('getById', () => {
    it('should return a module by its id', () => {
      const mockModule = { id: 'test-id' } as any;
      container.set('key', mockModule);

      expect(container.getById('test-id')).toBe(mockModule);
    });

    it('should return undefined if no module matches', () => {
      expect(container.getById('non-existent')).toBeUndefined();
    });
  });

  describe('getRpcTargetRegistry / addRpcTarget', () => {
    it('should emit targets added via addRpcTarget', async () => {
      const target = { pattern: 'test' };
      const promise = firstValueFrom(container.getRpcTargetRegistry());

      container.addRpcTarget(target);

      const result = await promise;
      expect(result).toBe(target);
    });

    it('should replay previous targets to new subscribers', async () => {
      container.addRpcTarget('first');
      container.addRpcTarget('second');

      const result = await firstValueFrom(container.getRpcTargetRegistry());
      expect(result).toBe('first');
    });
  });
});
