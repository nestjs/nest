import { DeterministicUuidRegistry } from '../../inspector/deterministic-uuid-registry.js';
import { UuidFactory, UuidFactoryMode } from '../../inspector/uuid-factory.js';

describe('UuidFactory', () => {
  afterEach(() => {
    UuidFactory.mode = UuidFactoryMode.Random;
    DeterministicUuidRegistry.clear();
  });

  describe('when mode is Random', () => {
    it('should return a random string', () => {
      UuidFactory.mode = UuidFactoryMode.Random;
      const id = UuidFactory.get('key');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should return different values on subsequent calls', () => {
      UuidFactory.mode = UuidFactoryMode.Random;
      const id1 = UuidFactory.get('key');
      const id2 = UuidFactory.get('key');
      expect(id1).not.toBe(id2);
    });
  });

  describe('when mode is Deterministic', () => {
    it('should return a deterministic id for the same key', () => {
      UuidFactory.mode = UuidFactoryMode.Deterministic;
      const id1 = UuidFactory.get('same-key');
      DeterministicUuidRegistry.clear();
      const id2 = UuidFactory.get('same-key');
      expect(id1).toBe(id2);
    });

    it('should return different ids for different keys', () => {
      UuidFactory.mode = UuidFactoryMode.Deterministic;
      const id1 = UuidFactory.get('key-a');
      const id2 = UuidFactory.get('key-b');
      expect(id1).not.toBe(id2);
    });
  });

  describe('get without key', () => {
    it('should work when called without arguments', () => {
      const id = UuidFactory.get();
      expect(typeof id).toBe('string');
    });
  });
});
