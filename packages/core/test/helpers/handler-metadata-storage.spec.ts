import { expect } from 'chai';
import { registerClassRef } from '../../helpers/class-ref-registry';
import { HandlerMetadataStorage } from '../../helpers/handler-metadata-storage';

describe('HandlerMetadataStorage', () => {
  let storage: HandlerMetadataStorage<string>;

  beforeEach(() => {
    storage = new HandlerMetadataStorage<string>();
  });

  it('should return the metadata stored for a handler of the class', () => {
    class Host {}

    storage.set(new Host(), 'handler', 'metadata');
    expect(storage.get(new Host(), 'handler')).to.equal('metadata');
    expect(storage.get(new Host(), 'another')).to.be.undefined;
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
    expect(storage.get(new Second(), 'handler')).to.be.undefined;
    expect(storage.get(new First(), 'handler')).to.equal('first');
  });
});
