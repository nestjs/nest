import { SettlementSignal } from '../../injector/settlement-signal.js';

describe('SettlementSignal', () => {
  function createHost(id: string) {
    return { id, settlementSignal: new SettlementSignal() };
  }

  describe('isCycle', () => {
    it('should return true when the host directly depends on the wrapper', () => {
      const first = createHost('first');
      const second = createHost('second');
      first.settlementSignal.insertRef(second);

      expect(first.settlementSignal.isCycle('second')).toBe(true);
    });

    it('should return true when the host depends on the wrapper through pending dependencies', () => {
      const first = createHost('first');
      const second = createHost('second');
      const third = createHost('third');
      first.settlementSignal.insertRef(second);
      second.settlementSignal.insertRef(third);

      expect(first.settlementSignal.isCycle('third')).toBe(true);
    });

    it('should return false when a dependency on the path has settled', () => {
      const first = createHost('first');
      const second = createHost('second');
      const third = createHost('third');
      first.settlementSignal.insertRef(second);
      second.settlementSignal.insertRef(third);
      second.settlementSignal.complete();

      expect(first.settlementSignal.isCycle('third')).toBe(false);
    });

    it('should return false when the host has settled', () => {
      const first = createHost('first');
      const second = createHost('second');
      first.settlementSignal.insertRef(second);
      first.settlementSignal.complete();

      expect(first.settlementSignal.isCycle('second')).toBe(false);
    });

    it('should return false for an unrelated wrapper even when the refs loop', () => {
      const first = createHost('first');
      const second = createHost('second');
      first.settlementSignal.insertRef(second);
      second.settlementSignal.insertRef(first);

      expect(first.settlementSignal.isCycle('unrelated')).toBe(false);
    });
  });
});
