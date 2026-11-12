import { expect } from 'chai';
import * as sinon from 'sinon';
import { DeterministicUuidRegistry } from '../../inspector/deterministic-uuid-registry';

describe('DeterministicUuidRegistry', () => {
  afterEach(() => {
    sinon.restore();
    DeterministicUuidRegistry.clear();
  });

  describe('get', () => {
    it('should not probe the suffixes it has already handed out', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(DeterministicUuidRegistry.get('same-string'));
      }
      const hashCodeSpy = sinon.spy(
        DeterministicUuidRegistry as any,
        'hashCode',
      );
      ids.add(DeterministicUuidRegistry.get('same-string'));

      expect(ids.size).to.equal(101);
      expect(hashCodeSpy.callCount).to.equal(1);
    });

    it('should return the ids of the first free suffixes, in order', () => {
      const ids = Array.from({ length: 3 }, () =>
        DeterministicUuidRegistry.get('seq'),
      );
      DeterministicUuidRegistry.clear();

      expect(ids).to.deep.equal([
        DeterministicUuidRegistry.get('seq'),
        DeterministicUuidRegistry.get('seq_1'),
        DeterministicUuidRegistry.get('seq_2'),
      ]);
    });
  });
});
