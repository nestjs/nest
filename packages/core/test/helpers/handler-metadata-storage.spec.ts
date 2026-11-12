import { registerClassRef } from '../../helpers/class-ref-registry.js';
import { HandlerMetadataStorage } from '../../helpers/handler-metadata-storage.js';

describe('HandlerMetadataStorage', () => {
  let storage: HandlerMetadataStorage<string>;

  beforeEach(() => {
    storage = new HandlerMetadataStorage<string>();
  });

  it('should return the metadata stored for a handler of the class', () => {
    class Host {}

    storage.set(new Host(), 'handler', 'metadata');
    expect(storage.get(new Host(), 'handler')).toBe('metadata');
    expect(storage.get(new Host(), 'another')).toBeUndefined();
  });

  it('should not share an entry between same-named classes', () => {
    const createHost = () => class Host {};
    const [First, Second] = [createHost(), createHost()];

    storage.set(new First(), 'handler', 'first');
    expect(storage.get(new Second(), 'handler')).toBeUndefined();
  });

  it('should not share an entry between classes that a mixin helper gave the same "constructor"', () => {
    class Mixin {}
    class First {}
    class Second {}
    [First, Second].forEach(host => {
      host.prototype.constructor = Mixin;
      registerClassRef(host);
    });

    storage.set(new First(), 'handler', 'first');
    expect(storage.get(new Second(), 'handler')).toBeUndefined();
    expect(storage.get(new First(), 'handler')).toBe('first');
  });
});
