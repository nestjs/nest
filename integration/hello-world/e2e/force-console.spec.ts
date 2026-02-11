import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('ForceConsole Option', () => {
  let app: INestApplication;

  describe('When forceConsole is true', () => {
    let consoleLogSpy: ReturnType<typeof vi.fn>;
    let consoleErrorSpy: ReturnType<typeof vi.fn>;
    let processStdoutSpy: ReturnType<typeof vi.fn>;
    let processStderrSpy: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      // Spy on console and process methods
      consoleLogSpy = vi.spyOn(console, 'log');
      consoleErrorSpy = vi.spyOn(console, 'error');
      processStdoutSpy = vi.spyOn(process.stdout, 'write');
      processStderrSpy = vi.spyOn(process.stderr, 'write');

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
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      processStdoutSpy.mockRestore();
      processStderrSpy.mockRestore();
      await app.close();
    });

    it('should use console.log instead of process.stdout.write', async () => {
      const logger = new ConsoleLogger('TestContext', { forceConsole: true });
      logger.log('Test log message');

      // Should use console.log when forceConsole is true
      expect(consoleLogSpy).toHaveBeenCalled();
      // Verify console.log was called with the message
      const consoleLogCalls = consoleLogSpy.mock.calls.filter(args =>
        args.some(arg => String(arg).includes('Test log message')),
      );
      expect(consoleLogCalls.length).toBeGreaterThan(0);
    });

    it('should use console.error instead of process.stderr.write', async () => {
      const logger = new ConsoleLogger('TestContext', { forceConsole: true });
      logger.error('Test error message');

      // Should use console.error when forceConsole is true
      expect(consoleErrorSpy).toHaveBeenCalled();
      // Verify console.error was called with the message
      const consoleErrorCalls = consoleErrorSpy.mock.calls.filter(args =>
        args.some(arg => String(arg).includes('Test error message')),
      );
      expect(consoleErrorCalls.length).toBeGreaterThan(0);
    });

    it('should handle GET request with forceConsole option enabled', () => {
      return request(app.getHttpServer()).get('/hello').expect(200);
    });
  });

  describe('When forceConsole is false (default)', () => {
    let consoleLogSpy: ReturnType<typeof vi.fn>;
    let consoleErrorSpy: ReturnType<typeof vi.fn>;
    let processStdoutSpy: ReturnType<typeof vi.fn>;
    let processStderrSpy: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      // Spy on console and process methods
      consoleLogSpy = vi.spyOn(console, 'log');
      consoleErrorSpy = vi.spyOn(console, 'error');
      processStdoutSpy = vi.spyOn(process.stdout, 'write');
      processStderrSpy = vi.spyOn(process.stderr, 'write');

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
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      processStdoutSpy.mockRestore();
      processStderrSpy.mockRestore();
      await app.close();
    });

    it('should not directly call console.log when forceConsole is false', async () => {
      const logger = new ConsoleLogger('TestContext');

      // Reset spy to ensure clean state
      consoleLogSpy.mockClear();

      logger.log('Test log message');

      // When forceConsole is false, should not call console.log
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not directly call console.error when forceConsole is false', async () => {
      const logger = new ConsoleLogger('TestContext');

      // Reset spy to ensure clean state
      consoleErrorSpy.mockClear();

      logger.error('Test error message');

      // When forceConsole is false, should not call console.error
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('When forceConsole is set via NestFactory.create', () => {
    it('should apply forceConsole to the default logger', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const processStdoutSpy = vi.spyOn(process.stdout, 'write');

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

      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      processStdoutSpy.mockRestore();
      await testApp.close();
    });
  });
});
