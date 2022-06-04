import { expect } from 'chai';
import * as sinon from 'sinon';
import { SelectReplFn } from '../../../repl/native-functions';
import { ReplContext } from '../../../repl/repl-context';
import { NestContainer } from '../../../injector/container';

describe('SelectReplFn', () => {
  let selectReplFn: SelectReplFn;

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
    selectReplFn = replContext.nativeFunctions.get('select') as SelectReplFn;
  });
  afterEach(() => sinon.restore());

  it('the function name should be "select"', () => {
    expect(selectReplFn).to.not.be.undefined;
    expect(selectReplFn.fnDefinition.name).to.eql('select');
  });

  describe('action', () => {
    it('should pass arguments down to the application context', () => {
      const moduleCls = class TestModule {};
      selectReplFn.action(moduleCls);
      expect(mockApp.select.calledWith(moduleCls)).to.be.true;
    });
  });
});
