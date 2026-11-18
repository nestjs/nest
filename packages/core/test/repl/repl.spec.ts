import { Injectable, Module } from '@nestjs/common';
import type { REPLServer } from 'repl';
import { PassThrough, Writable } from 'stream';
import { repl } from '../../repl/repl.js';

@Injectable()
class CatsService {
  findAll() {
    return ['Tom'];
  }
}

@Module({ providers: [CatsService] })
class CatsModule {}

describe('repl', () => {
  let replServer: REPLServer;
  let replOutput: string;
  let stdout: string;

  beforeEach(async () => {
    replOutput = '';
    stdout = '';
    // The logger and the native functions write to the standard output
    vi.spyOn(process.stdout, 'write').mockImplementation(text => {
      stdout += text as string;
      return true;
    });

    replServer = await repl(CatsModule, {
      input: new PassThrough(),
      output: new Writable({
        write(chunk, _encoding, callback) {
          replOutput += chunk;
          callback();
        },
      }),
      terminal: false,
    });
  });

  afterEach(() => {
    replServer.close();
    vi.restoreAllMocks();
  });

  it('should expose the native functions and the providers', () => {
    replServer.emit('line', 'get(CatsService).findAll()');

    expect(replOutput).toContain(`[ 'Tom' ]`);
  });

  it('should drop the variables defined before ".clear"', () => {
    replServer.emit('line', 'var foo = 1');
    replServer.emit('line', '.clear');
    replOutput = '';

    replServer.emit('line', 'typeof foo');

    expect(replOutput).toContain(`'undefined'`);
  });

  describe('when the ".clear" command resets the context', () => {
    beforeEach(() => {
      replServer.emit('line', '.clear');
      replOutput = '';
      stdout = '';
    });

    it('should still expose the native functions and the providers', () => {
      replServer.emit('line', 'get(CatsService).findAll()');

      expect(replOutput).toContain(`[ 'Tom' ]`);
    });

    it('should still list the native functions on ".help"', () => {
      replServer.emit('line', '.help');

      expect(stdout).toContain('Display all available REPL native functions.');
    });
  });
});
