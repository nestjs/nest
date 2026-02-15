import { clc } from '@nestjs/common/utils/cli-colors.util.js';
import { repl } from '@nestjs/core';
import {
  DebugReplFn,
  GetReplFn,
  HelpReplFn,
  MethodsReplFn,
  ResolveReplFn,
  SelectReplFn,
} from '@nestjs/core/repl/native-functions';
import { ReplContext } from '@nestjs/core/repl/repl-context.js';
import { AppModule } from '../src/app.module.js';

const PROMPT = '\u001b[1G\u001b[0J> \u001b[3G';

describe('REPL', () => {
  beforeEach(() => {
    // To avoid coloring the output:
    vi.spyOn(clc, 'bold').mockImplementation(text => text);
    vi.spyOn(clc, 'green').mockImplementation(text => text);
    vi.spyOn(clc, 'yellow').mockImplementation(text => text);
    vi.spyOn(clc, 'red').mockImplementation(text => text);
    vi.spyOn(clc, 'magentaBright').mockImplementation(text => text);
    vi.spyOn(clc, 'cyanBright').mockImplementation(text => text);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('get()', async () => {
    const server = await repl(AppModule);
    server.context;
    let outputText = '';
    vi.spyOn(process.stdout, 'write').mockImplementation(text => {
      outputText += text as string;
      return true;
    });
    server.emit('line', 'get(UsersService)');

    expect(outputText).toBe(
      `UsersService { usersRepository: UsersRepository {} }
${PROMPT}`,
    );

    outputText = '';
    server.emit('line', 'get(UsersService).findAll()');

    expect(outputText).toBe(`\u001b[32m'This action returns all users'\u001b[39m
${PROMPT}`);

    outputText = '';
    server.emit('line', 'get("UsersRepository")');

    expect(outputText).toBe(`UsersRepository {}
${PROMPT}`);
  });

  it('$()', async () => {
    const server = await repl(AppModule);
    server.context;
    let outputText = '';
    vi.spyOn(process.stdout, 'write').mockImplementation(text => {
      outputText += text as string;
      return true;
    });
    server.emit('line', '$(UsersService)');

    expect(outputText).toBe(
      `UsersService { usersRepository: UsersRepository {} }
${PROMPT}`,
    );

    outputText = '';
    server.emit('line', '$(UsersService).findAll()');

    expect(outputText).toBe(`\u001b[32m'This action returns all users'\u001b[39m
${PROMPT}`);

    outputText = '';
    server.emit('line', '$("UsersRepository")');

    expect(outputText).toBe(`UsersRepository {}
${PROMPT}`);
  });

  it('debug()', async () => {
    const server = await repl(AppModule);

    let outputText = '';
    vi.spyOn(process.stdout, 'write').mockImplementation(text => {
      outputText += text as string;
      return true;
    });
    server.emit('line', 'debug(UsersModule)');

    expect(outputText).toBe(
      `
UsersModule:
 - controllers:
  ◻ UsersController
 - providers:
  ◻ UsersService
  ◻ "UsersRepository"

${PROMPT}`,
    );
  });

  it('methods()', async () => {
    const server = await repl(AppModule);

    let outputText = '';
    vi.spyOn(process.stdout, 'write').mockImplementation(text => {
      outputText += text as string;
      return true;
    });
    server.emit('line', 'methods("UsersRepository")');

    expect(outputText).toBe(
      `
Methods:
 ◻ find

${PROMPT}`,
    );

    outputText = '';
    server.emit('line', 'methods(UsersService)');

    expect(outputText).toBe(
      `
Methods:
 ◻ create
 ◻ findAll
 ◻ findOne
 ◻ update
 ◻ remove

${PROMPT}`,
    );
  });

  describe('<native_function>.help', () => {
    it(`Typing "help.help" should print function's description and interface`, async () => {
      const replServer = await repl(AppModule);

      const { description, signature } = new HelpReplFn(
        vi.fn() as unknown as ReplContext,
      ).fnDefinition;
      let outputText = '';
      vi.spyOn(process.stdout, 'write').mockImplementation(text => {
        outputText += text as string;
        return true;
      });

      replServer.emit('line', 'help.help');

      expect(outputText).toBe(`${description}
Interface: help${signature}
${PROMPT}`);
    });

    it(`Typing "get.help" should print function's description and interface`, async () => {
      const replServer = await repl(AppModule);

      const { description, signature } = new GetReplFn(
        vi.fn() as unknown as ReplContext,
      ).fnDefinition;
      let outputText = '';
      vi.spyOn(process.stdout, 'write').mockImplementation(text => {
        outputText += text as string;
        return true;
      });

      replServer.emit('line', 'get.help');

      expect(outputText).toBe(`${description}
Interface: get${signature}
${PROMPT}`);
    });

    it(`Typing "resolve.help" should print function's description and interface`, async () => {
      const replServer = await repl(AppModule);

      const { description, signature } = new ResolveReplFn(
        vi.fn() as unknown as ReplContext,
      ).fnDefinition;
      let outputText = '';
      vi.spyOn(process.stdout, 'write').mockImplementation(text => {
        outputText += text as string;
        return true;
      });

      replServer.emit('line', 'resolve.help');

      expect(outputText).toBe(`${description}
Interface: resolve${signature}
${PROMPT}`);
    });

    it(`Typing "select.help" should print function's description and interface`, async () => {
      const replServer = await repl(AppModule);

      const { description, signature } = new SelectReplFn(
        vi.fn() as unknown as ReplContext,
      ).fnDefinition;
      let outputText = '';
      vi.spyOn(process.stdout, 'write').mockImplementation(text => {
        outputText += text as string;
        return true;
      });

      replServer.emit('line', 'select.help');

      expect(outputText).toBe(`${description}
Interface: select${signature}
${PROMPT}`);
    });

    it(`Typing "debug.help" should print function's description and interface`, async () => {
      const replServer = await repl(AppModule);

      const { description, signature } = new DebugReplFn(
        vi.fn() as unknown as ReplContext,
      ).fnDefinition;
      let outputText = '';
      vi.spyOn(process.stdout, 'write').mockImplementation(text => {
        outputText += text as string;
        return true;
      });

      replServer.emit('line', 'debug.help');

      expect(outputText).toBe(`${description}
Interface: debug${signature}
${PROMPT}`);
    });

    it(`Typing "methods.help" should print function's description and interface`, async () => {
      const replServer = await repl(AppModule);

      const { description, signature } = new MethodsReplFn(
        vi.fn() as unknown as ReplContext,
      ).fnDefinition;
      let outputText = '';
      vi.spyOn(process.stdout, 'write').mockImplementation(text => {
        outputText += text as string;
        return true;
      });

      replServer.emit('line', 'methods.help');

      expect(outputText).toBe(`${description}
Interface: methods${signature}
${PROMPT}`);
    });
  });
});
