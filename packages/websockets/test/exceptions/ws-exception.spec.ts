import * as sinon from 'sinon';
import { expect } from 'chai';
import { WsException } from '../../errors/ws-exception';

describe('WsException', () => {
  let instance: WsException;
  const error = 'test';
  beforeEach(() => {
    instance = new WsException(error);
  });
  it('should returns error message or object', () => {
    expect(instance.getError()).to.be.eql(error);
  });

  it('should serialize', () => {
    expect(`${instance}`.includes(error)).to.be.true;
    const obj = { foo: 'bar' };
    expect(`${new WsException(obj)}`.includes(JSON.stringify(obj))).to.be.true;
  });
});
