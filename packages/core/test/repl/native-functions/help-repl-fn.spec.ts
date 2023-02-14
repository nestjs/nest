import { expect } from 'chai';
import * as sinon from 'sinon';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { HelpReplFn } from '../../../repl/native-functions';
import { ReplContext } from '../../../repl/repl-context';
import { NestContainer } from '../../../injector/container';

describe('HelpReplFn', () => {
  let helpReplFn: HelpReplFn;

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
    helpReplFn = replContext.nativeFunctions.get('help') as HelpReplFn;

    // To avoid coloring the output:
    sinon.stub(clc, 'bold').callsFake(text => text);
    sinon.stub(clc, 'cyanBright').callsFake(text => text);
  });
  afterEach(() => sinon.restore());

  it('the function name should be "help"', () => {
    expect(helpReplFn).to.not.be.undefined;
    expect(helpReplFn.fnDefinition.name).to.eql('help');
  });

  describe('action', () => {
    it('should print all available native functions and their description', () => {
      let outputText = '';
      sinon
        .stub(replContext, 'writeToStdout')
        .callsFake(text => (outputText += text));

      helpReplFn.action();

      expect(outputText).to
        .equal(`You can call .help on any function listed below (e.g.: help.help):

$ - Retrieves an instance of either injectable or controller, otherwise, throws exception.
debug - Print all registered modules as a list together with their controllers and providers.
If the argument is passed in, for example, "debug(MyModule)" then it will only print components of this specific module.
get - Retrieves an instance of either injectable or controller, otherwise, throws exception.
help - Display all available REPL native functions.
methods - Display all public methods available on a given provider or controller.
resolve - Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
select - Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
`);
    });
  });
});
