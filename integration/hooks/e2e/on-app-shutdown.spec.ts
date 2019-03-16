import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';
import { Injectable, OnApplicationShutdown, ShutdownSignal } from '@nestjs/common';
import { spawn, spawnSync } from 'child_process';
import { join } from 'path';

@Injectable()
class TestInjectable implements OnApplicationShutdown {
  onApplicationShutdown = Sinon.spy();
}

describe('OnApplicationShutdown', () => {
  it('should call onApplicationShutdown when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.onApplicationShutdown.called).to.be.true;
  });

  it('should call onApplicationShutdown if any shutdown signal gets invoked', done => {
    const result = spawnSync('ts-node', [join(__dirname, '../src/main.ts'), 'SIGHUP']);
    expect(result.stdout.toString().trim()).to.be.eq('Signal SIGHUP');
    done();
  });

  it('should call onApplicationShutdown if a specific shutdown signal gets invoked', done => {
    const result = spawnSync('ts-node', [join(__dirname, '../src/main.ts'), 'SIGINT', 'SIGINT']);
    expect(result.stdout.toString().trim()).to.be.eq('Signal SIGINT');
    done();
  });

  it('should ignore system signals which are not specified', done => {
    const result = spawnSync('ts-node', [join(__dirname, '../src/main.ts'), 'SIGINT', 'SIGHUP']);
    expect(result.stdout.toString().trim()).to.be.eq('');
    done();
  });

  it('should ignore system signals if "enableShutdownHooks" was not called', done => {
    const result = spawnSync('ts-node', [join(__dirname, '../src/main.ts'), 'SIGINT', 'NONE']);
    expect(result.stdout.toString().trim()).to.be.eq('');
    done();
  });
});
