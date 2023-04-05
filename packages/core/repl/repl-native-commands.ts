import type { REPLServer } from 'repl';

/**
 * Displays a list of available commands in the REPL alongside with their
 * descriptions.
 * (c) This code was inspired by the 'help' command from Node.js core:
 * {@link https://github.com/nodejs/node/blob/58b60c1393dd65cd228a8b0084a19acd2c1d16aa/lib/repl.js#L1741-L1759}
 */
function listAllCommands(replServer: REPLServer) {
  Object.keys(replServer.commands)
    .sort()
    .forEach(name => {
      const cmd = replServer.commands[name];
      if (cmd) {
        replServer.output.write(`${name}\t${cmd.help || ''}\n`);
      }
    });
}

export function defineDefaultCommandsOnRepl(replServer: REPLServer): void {
  replServer.defineCommand('help', {
    help: 'Show REPL options',
    action(name?: string) {
      this.clearBufferedCommand();

      if (name) {
        // Considering native commands before native nestjs injected functions.
        const nativeCommandOrFunction =
          this.commands[name] || this.context[name];
        // NOTE: If the command was retrieve from the context, it will have a `help`
        // getter property that outputs the helper message and returns undefined.
        // But if the command was retrieve from the `commands` object, it will
        // have a `help` property that returns the helper message.
        const helpMessage = nativeCommandOrFunction?.help;
        if (helpMessage) {
          this.output.write(`${helpMessage}\n`);
        }
      } else {
        listAllCommands(this);
        this.output.write('\n\n');
        this.context.help();
        this.output.write(
          '\nPress Ctrl+C to abort current expression, Ctrl+D to exit the REPL\n',
        );
      }

      this.displayPrompt();
    },
  });
}
