import { makeSafeInstanceDecorator } from '../../helpers/safe-instance-decorator.js';

describe('makeSafeInstanceDecorator', () => {
  it('should return the decorated instance when the decorator succeeds', () => {
    const decorated = { decorated: true };
    const decorator = vi.fn().mockReturnValue(decorated);
    const safeDecorator = makeSafeInstanceDecorator(decorator);
    const instance = {};

    expect(safeDecorator(instance)).toBe(decorated);
    expect(decorator).toHaveBeenCalledExactlyOnceWith(instance);
  });

  it('should fall back to the original instance when the decorator throws', () => {
    const decorator = vi.fn().mockImplementation(() => {
      throw new Error('cannot inspect');
    });
    const safeDecorator = makeSafeInstanceDecorator(decorator);
    const instance = {};

    expect(safeDecorator(instance)).toBe(instance);
  });

  it('should fall back to the original instance when inspecting a proxy whose traps throw', () => {
    // Mimics nestjs-cls proxy providers (CLS_REQ, CLS_RES) that throw
    // on any property access outside of an active CLS context.
    const hostileProxy = new Proxy(
      {},
      {
        get: () => {
          throw new Error('does not exist in the CLS');
        },
      },
    );
    const decorator = (instance: any) => {
      void instance.decorate;
      return instance;
    };
    const safeDecorator = makeSafeInstanceDecorator(decorator);

    expect(safeDecorator(hostileProxy)).toBe(hostileProxy);
  });
});
