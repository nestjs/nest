import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as sinon from 'sinon';
import { expect } from 'chai';

describe('ForceConsole Option', () => {
  let app: INestApplication;

  describe('When forceConsole is true', () => {
    let consoleLogSpy: sinon.SinonSpy;
    let consoleErrorSpy: sinon.SinonSpy;
    let processStdoutSpy: sinon.SinonSpy;
    let processStderrSpy: sinon.SinonSpy;

    beforeEach(async () => {
      // Spy on console and process methods
      consoleLogSpy = sinon.spy(console, 'log');
      consoleErrorSpy = sinon.spy(console, 'error');
      processStdoutSpy = sinon.spy(process.stdout, 'write');
      processStderrSpy = sinon.spy(process.stderr, 'write');

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication({
        forceConsole: true,
        logger: ['log', 'error'],
      });

      await app.init();
    });

    afterEach(async () => {
      consoleLogSpy.restore();
      consoleErrorSpy.restore();
      processStdoutSpy.restore();
      processStderrSpy.restore();
      await app.close();
    });

    it('should use console.log instead of process.stdout.write', async () => {
      const logger = new ConsoleLogger('TestContext', { forceConsole: true });
      logger.log('Test log message');

      // Should use console.log when forceConsole is true
      expect(consoleLogSpy.called).to.be.true;
      // Verify console.log was called with the message
      const consoleLogCalls = consoleLogSpy
        .getCalls()
        .filter(call =>
          call.args.some(arg => String(arg).includes('Test log message')),
        );
      expect(consoleLogCalls.length).to.be.greaterThan(0);
    });

    it('should use console.error instead of process.stderr.write', async () => {
      const logger = new ConsoleLogger('TestContext', { forceConsole: true });
      logger.error('Test error message');

      // Should use console.error when forceConsole is true
      expect(consoleErrorSpy.called).to.be.true;
      // Verify console.error was called with the message
      const consoleErrorCalls = consoleErrorSpy
        .getCalls()
        .filter(call =>
          call.args.some(arg => String(arg).includes('Test error message')),
        );
      expect(consoleErrorCalls.length).to.be.greaterThan(0);
    });

    it('should handle GET request with forceConsole option enabled', () => {
      return request(app.getHttpServer()).get('/hello').expect(200);
    });
  });

  describe('When forceConsole is false (default)', () => {
    let consoleLogSpy: sinon.SinonSpy;
    let consoleErrorSpy: sinon.SinonSpy;
    let processStdoutSpy: sinon.SinonSpy;
    let processStderrSpy: sinon.SinonSpy;

    beforeEach(async () => {
      // Spy on console and process methods
      consoleLogSpy = sinon.spy(console, 'log');
      consoleErrorSpy = sinon.spy(console, 'error');
      processStdoutSpy = sinon.spy(process.stdout, 'write');
      processStderrSpy = sinon.spy(process.stderr, 'write');

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication({
        logger: ['log', 'error'],
        // forceConsole is not set, defaults to false
      });

      await app.init();
    });

    afterEach(async () => {
      consoleLogSpy.restore();
      consoleErrorSpy.restore();
      processStdoutSpy.restore();
      processStderrSpy.restore();
      await app.close();
    });

    it('should not directly call console.log when forceConsole is false', async () => {
      const logger = new ConsoleLogger('TestContext');

      // Reset spy to ensure clean state
      consoleLogSpy.resetHistory();

      logger.log('Test log message');

      // When forceConsole is false, should not call console.log
      expect(consoleLogSpy.called).to.be.false;
    });

    it('should not directly call console.error when forceConsole is false', async () => {
      const logger = new ConsoleLogger('TestContext');

      // Reset spy to ensure clean state
      consoleErrorSpy.resetHistory();

      logger.error('Test error message');

      // When forceConsole is false, should not call console.error
      expect(consoleErrorSpy.called).to.be.false;
    });
  });

  describe('When forceConsole is set via NestFactory.create', () => {
    it('should apply forceConsole to the default logger', async () => {
      const consoleLogSpy = sinon.spy(console, 'log');
      const processStdoutSpy = sinon.spy(process.stdout, 'write');

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const testApp = moduleRef.createNestApplication({
        forceConsole: true,
      });

      await testApp.init();

      // The logger created by NestFactory should respect forceConsole option
      const logger = new ConsoleLogger('AppContext', { forceConsole: true });
      logger.log('Application started');

      expect(consoleLogSpy.called).to.be.true;

      consoleLogSpy.restore();
      processStdoutSpy.restore();
      await testApp.close();
    });
  });
});
