import { DeterministicUuidRegistry } from '../../inspector/deterministic-uuid-registry.js';

describe('DeterministicUuidRegistry', () => {
  afterEach(() => {
    DeterministicUuidRegistry.clear();
  });

  describe('get', () => {
    it('should return a deterministic string id for a given input', () => {
      const id = DeterministicUuidRegistry.get('test');
      expect(typeof id).toBe('string');
    });

    it('should return the same id for the same input after clearing', () => {
      const id1 = DeterministicUuidRegistry.get('hello');
      DeterministicUuidRegistry.clear();
      const id2 = DeterministicUuidRegistry.get('hello');
      expect(id1).toBe(id2);
    });

    it('should return different ids for different inputs', () => {
      const id1 = DeterministicUuidRegistry.get('input-a');
      const id2 = DeterministicUuidRegistry.get('input-b');
      expect(id1).not.toBe(id2);
    });

    it('should handle collisions by incrementing', () => {
      // Getting the same string twice should produce different IDs (collision avoidance)
      const id1 = DeterministicUuidRegistry.get('same-string');
      const id2 = DeterministicUuidRegistry.get('same-string');
      expect(id1).not.toBe(id2);
    });

    it('should keep returning unique ids for the same input without exhausting the call stack', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 20_000; i++) {
        ids.add(DeterministicUuidRegistry.get('same-string'));
      }
      expect(ids.size).toBe(20_000);
    });

    it('should return the ids of the first free suffixes, in order', () => {
      const ids = Array.from({ length: 3 }, () =>
        DeterministicUuidRegistry.get('seq'),
      );
      DeterministicUuidRegistry.clear();

      expect(ids).toEqual([
        DeterministicUuidRegistry.get('seq'),
        DeterministicUuidRegistry.get('seq_1'),
        DeterministicUuidRegistry.get('seq_2'),
      ]);
    });
  });

  describe('clear', () => {
    it('should reset the registry', () => {
      const id1 = DeterministicUuidRegistry.get('test-clear');
      DeterministicUuidRegistry.clear();
      // After clearing, the same string should produce the same ID (no collision)
      const id2 = DeterministicUuidRegistry.get('test-clear');
      expect(id1).toBe(id2);
    });
  });
});
