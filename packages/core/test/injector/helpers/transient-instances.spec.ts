import {
  getNonTransientInstances,
  getTransientInstances,
} from '../../../injector/helpers/transient-instances.js';

function createMockWrapper(options: {
  isDependencyTreeStatic?: boolean;
  isTransient?: boolean;
  instance?: any;
  staticTransientInstances?: any[];
}) {
  return {
    isDependencyTreeStatic: vi
      .fn()
      .mockReturnValue(options.isDependencyTreeStatic ?? true),
    isTransient: options.isTransient ?? false,
    instance: options.instance ?? { mock: true },
    getStaticTransientInstances: vi
      .fn()
      .mockReturnValue(options.staticTransientInstances ?? []),
  } as any;
}

describe('transient-instances helpers', () => {
  describe('getTransientInstances', () => {
    it('should return empty array when no instances', () => {
      expect(getTransientInstances([])).toEqual([]);
    });

    it('should skip wrappers that are not static dependency trees', () => {
      const wrapper = createMockWrapper({
        isDependencyTreeStatic: false,
        staticTransientInstances: [{ instance: 'test' }],
      });

      const result = getTransientInstances([['token', wrapper]]);
      expect(result).toEqual([]);
    });

    it('should return instances from static transient wrappers', () => {
      const instance = { name: 'transient-service' };
      const wrapper = createMockWrapper({
        isDependencyTreeStatic: true,
        staticTransientInstances: [{ instance }],
      });

      const result = getTransientInstances([['token', wrapper]]);
      expect(result).toContain(instance);
    });

    it('should filter out falsy static transient instances', () => {
      const wrapper = createMockWrapper({
        isDependencyTreeStatic: true,
        staticTransientInstances: [null, undefined, { instance: 'valid' }],
      });

      const result = getTransientInstances([['token', wrapper]]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('valid');
    });
  });

  describe('getNonTransientInstances', () => {
    it('should return empty array when no instances', () => {
      expect(getNonTransientInstances([])).toEqual([]);
    });

    it('should return instances of non-transient static wrappers', () => {
      const instance = { name: 'singleton-service' };
      const wrapper = createMockWrapper({
        isDependencyTreeStatic: true,
        isTransient: false,
        instance,
      });

      const result = getNonTransientInstances([['token', wrapper]]);
      expect(result).toContain(instance);
    });

    it('should skip transient wrappers', () => {
      const wrapper = createMockWrapper({
        isDependencyTreeStatic: true,
        isTransient: true,
        instance: { name: 'should-be-skipped' },
      });

      const result = getNonTransientInstances([['token', wrapper]]);
      expect(result).toEqual([]);
    });

    it('should skip wrappers that are not static dependency trees', () => {
      const wrapper = createMockWrapper({
        isDependencyTreeStatic: false,
        isTransient: false,
        instance: { name: 'should-be-skipped' },
      });

      const result = getNonTransientInstances([['token', wrapper]]);
      expect(result).toEqual([]);
    });
  });
});
