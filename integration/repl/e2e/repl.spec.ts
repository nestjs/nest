import { clc } from '@nestjs/common/utils/cli-colors.util';
import { repl } from '@nestjs/core';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { AppModule } from '../src/app.module';
import { UsersModule } from '../src/users/users.module';

const prompt = '\u001b[1G\u001b[0J\u001b[32m>\u001b[0m \u001b[3G';

describe('REPL', () => {
  beforeEach(() => {
    sinon.stub(clc, 'yellow').callsFake(text => text);
    sinon.stub(clc, 'green').callsFake(text => text);
  });
  afterEach(() => {
    sinon.restore();
    delete globalThis[AppModule.name];
    delete globalThis[UsersModule.name];
  });

  it('get()', async () => {
    const server = await repl(AppModule);

    let outputText = '';
    sinon.stub(process.stdout, 'write').callsFake(text => {
      outputText += text;
      return true;
    });
    server.emit('line', 'get(UsersService)');

    expect(outputText).to.equal(
      `UsersService { usersRepository: UsersRepository {} }
${prompt}`,
    );

    outputText = '';
    server.emit('line', 'get(UsersService).findAll()');

    expect(outputText).to
      .equal(`\u001b[32m'This action returns all users'\u001b[39m
${prompt}`);

    outputText = '';
    server.emit('line', 'get(UsersRepository)');

    expect(outputText).to.equal(`UsersRepository {}
${prompt}`);
  });

  it('debug()', async () => {
    const server = await repl(AppModule);

    let outputText = '';
    sinon.stub(process.stdout, 'write').callsFake(text => {
      outputText += text;
      return true;
    });
    server.emit('line', 'debug(UsersModule)');

    expect(outputText).to.equal(
      `
UsersModule:
 - controllers:
  ◻ UsersController
 - providers:
  ◻ UsersService
  ◻ UsersRepository

${prompt}`,
    );
  });

  it('methods()', async () => {
    const server = await repl(AppModule);

    let outputText = '';
    sinon.stub(process.stdout, 'write').callsFake(text => {
      outputText += text;
      return true;
    });
    server.emit('line', 'methods(UsersRepository)');

    expect(outputText).to.equal(
      `
Methods:
 ◻ find

${prompt}`,
    );

    outputText = '';
    server.emit('line', 'methods(UsersService)');

    expect(outputText).to.equal(
      `
Methods:
 ◻ create
 ◻ findAll
 ◻ findOne
 ◻ update
 ◻ remove

${prompt}`,
    );
  });
});
