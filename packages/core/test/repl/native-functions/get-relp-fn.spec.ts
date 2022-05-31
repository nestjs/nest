import { expect } from 'chai';
import * as sinon from 'sinon';
import { GetReplFn } from '../../../repl/native-functions';
import { ReplContext } from '../../../repl/repl-context';
import { NestContainer } from '../../../injector/container';

describe('GetReplFn', () => {
  let getReplFn: GetReplFn;

  let replContext: ReplContext;
  let mockApp: {
    container: NestContainer;
    get: sinon.SinonStub;
    resolve: sinon.SinonSpy;
    select: sinon.SinonSpy;
  };

  before(async () => {
    const container = new NestContainer();

    mockApp = {
      container,
      get: sinon.stub(),
      resolve: sinon.spy(),
      select: sinon.spy(),
    };
    replContext = new ReplContext(mockApp as any);
  });

  beforeEach(() => {
    getReplFn = replContext.nativeFunctions.get('get') as GetReplFn;
  });
  afterEach(() => sinon.restore());

  it('the function name should be "get"', () => {
    expect(getReplFn).to.not.be.undefined;
    expect(getReplFn.fnDefinition.name).to.eql('get');
  });

  describe('action', () => {
    it('should pass arguments down to the application context', () => {
      const token = 'test';
      getReplFn.action(token);
      expect(mockApp.get.calledWith(token)).to.be.true;
    });
  });
});
