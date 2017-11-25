import {expect} from 'chai';
import * as sinon from 'sinon';

import {WsException} from '../../exceptions/ws-exception';

describe('WsException', () => {
  let instance: WsException;
  const error = 'test';
  beforeEach(() => { instance = new WsException(error); });
  it('should returns error message or object',
     () => { expect(instance.getError()).to.be.eql(error); });
});