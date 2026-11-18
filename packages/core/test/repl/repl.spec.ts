import { Injectable, Module } from '@nestjs/common';
import { expect } from 'chai';
import type { REPLServer } from 'repl';
import * as sinon from 'sinon';
import { PassThrough, Writable } from 'stream';
import { repl } from '../../repl/repl';

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

  // The logger and the native functions write to the standard output
  const captureStdout = async (fn: () => unknown) => {
    let stdout = '';
    const write = sinon
      .stub(process.stdout, 'write')
      .callsFake((text: string | Uint8Array) => {
        stdout += text.toString();
        return true;
      });
    try {
      await fn();
    } finally {
      write.restore();
    }
    return stdout;
  };

  beforeEach(async () => {
    replOutput = '';
    await captureStdout(async () => {
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
  });

  afterEach(() => {
    replServer.close();
    sinon.restore();
  });

  it('should expose the native functions and the providers', () => {
    replServer.emit('line', 'get(CatsService).findAll()');

    expect(replOutput).to.contain(`[ 'Tom' ]`);
  });

  it('should drop the variables defined before ".clear"', () => {
    replServer.emit('line', 'var foo = 1');
    replServer.emit('line', '.clear');
    replOutput = '';

    replServer.emit('line', 'typeof foo');

    expect(replOutput).to.contain(`'undefined'`);
  });

  describe('when the ".clear" command resets the context', () => {
    beforeEach(() => {
      replServer.emit('line', '.clear');
      replOutput = '';
    });

    it('should still expose the native functions and the providers', () => {
      replServer.emit('line', 'get(CatsService).findAll()');

      expect(replOutput).to.contain(`[ 'Tom' ]`);
    });

    it('should still list the native functions on ".help"', async () => {
      const stdout = await captureStdout(() =>
        replServer.emit('line', '.help'),
      );

      expect(stdout).to.contain('Display all available REPL native functions.');
    });
  });
});
