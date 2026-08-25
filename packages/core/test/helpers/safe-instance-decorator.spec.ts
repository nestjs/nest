import { expect } from 'chai';
import * as sinon from 'sinon';
import { makeSafeInstanceDecorator } from '../../helpers/safe-instance-decorator';

describe('makeSafeInstanceDecorator', () => {
  it('should return the decorated instance when the decorator succeeds', () => {
    const decorated = { decorated: true };
    const decorator = sinon.stub().returns(decorated);
    const safeDecorator = makeSafeInstanceDecorator(decorator);
    const instance = {};

    expect(safeDecorator(instance)).to.equal(decorated);
    expect(decorator.calledOnceWithExactly(instance)).to.be.true;
  });

  it('should fall back to the original instance when the decorator throws', () => {
    const decorator = sinon.stub().throws(new Error('cannot inspect'));
    const safeDecorator = makeSafeInstanceDecorator(decorator);
    const instance = {};

    expect(safeDecorator(instance)).to.equal(instance);
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

    expect(safeDecorator(hostileProxy)).to.equal(hostileProxy);
  });
});
