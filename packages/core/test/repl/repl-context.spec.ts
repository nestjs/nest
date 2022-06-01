import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../injector/container';
import { ReplContext } from '../../repl/repl-context';

describe('ReplContext', () => {
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

  afterEach(() => sinon.restore());

  it('writeToStdout', () => {
    const stdOutWrite = sinon.stub(process.stdout, 'write');
    const text = sinon.stub() as unknown as string;

    replContext.writeToStdout(text);

    expect(stdOutWrite.calledOnce).to.be.true;
    expect(stdOutWrite.calledWith(text)).to.be.true;
  });
});
