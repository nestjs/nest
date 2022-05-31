import { clc } from '@nestjs/common/utils/cli-colors.util';
import { ReplFunction } from '../repl-function';
import type { ReplFnDefinition } from '../repl.interfaces';

export class HelpReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'help',
    signature: '() => void',
    description: 'Display all available REPL native functions.',
  };

  action(): void {
    const buildHelpMessage = ({ name, description }: ReplFnDefinition) =>
      clc.cyanBright(name) +
      (description ? ` ${clc.bold('-')} ${description}` : '');

    const sortedNativeFunctions = this.ctx.nativeFunctions
      .map(nativeFunction => nativeFunction.fnDefinition)
      .sort((a, b) => (a.name < b.name ? -1 : 1));

    this.ctx.writeToStdout(
      `You can call ${clc.bold(
        '.help',
      )} on any function listed below (e.g.: ${clc.bold('help.help')}):\n\n` +
        sortedNativeFunctions.map(buildHelpMessage).join('\n') +
        // Without the following LF the last item won't be displayed
        '\n',
    );
  }
}
