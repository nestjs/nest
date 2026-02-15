import { Logger } from '@nestjs/common';
import { ExceptionsZone } from '../../../errors/exceptions-zone.js';

describe('ExceptionsZone', () => {
  const rethrow = err => {
    throw err;
  };

  describe('run', () => {
    let callback: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      callback = vi.fn();
    });
    it('should call callback', () => {
      ExceptionsZone.run(callback as any, rethrow, false);
      expect(callback).toHaveBeenCalled();
    });
    describe('when callback throws exception', () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: ReturnType<typeof vi.fn>;
      let LoggerFlushSpy: ReturnType<typeof vi.fn>;
      beforeAll(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = vi.spyOn(exceptionHandler, 'handle');
        LoggerFlushSpy = vi.spyOn(Logger, 'flush');
      });
      afterAll(() => {
        LoggerFlushSpy.mockRestore();
      });
      describe('when callback throws exception and autoFlushLogs is false', () => {
        it('should call "handle" method of exceptionHandler and rethrows and not flush logs', () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          expect(() =>
            ExceptionsZone.run(throwsCallback, rethrow, false),
          ).toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).not.toHaveBeenCalled();
        });
      });

      describe('when callback throws exception and autoFlushLogs is true', () => {
        it('should call "handle" method of exceptionHandler and rethrows and flush logs', () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          expect(() =>
            ExceptionsZone.run(throwsCallback, rethrow, true),
          ).toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).toHaveBeenCalled();
        });
      });
    });
  });

  describe('asyncRun', () => {
    let callback: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      callback = vi.fn();
    });
    it('should call callback', async () => {
      await ExceptionsZone.asyncRun(callback as any, rethrow, false);
      expect(callback).toHaveBeenCalled();
    });
    describe('when callback throws exception', () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: ReturnType<typeof vi.fn>;
      let LoggerFlushSpy: ReturnType<typeof vi.fn>;
      beforeAll(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = vi.spyOn(exceptionHandler, 'handle');
        LoggerFlushSpy = vi.spyOn(Logger, 'flush');
      });
      afterAll(() => {
        LoggerFlushSpy.mockRestore();
      });
      describe('when callback throws exception and autoFlushLogs is false', () => {
        it('should call "handle" method of exceptionHandler and rethrows error and not flush logs', async () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          await expect(
            ExceptionsZone.asyncRun(throwsCallback, rethrow, false),
          ).rejects.toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).not.toHaveBeenCalled();
        });
      });
      describe('when callback throws exception and autoFlushLogs is true', () => {
        it('should call "handle" method of exceptionHandler and rethrows error and flush logs', async () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          await expect(
            ExceptionsZone.asyncRun(throwsCallback, rethrow, true),
          ).rejects.toThrow();

          expect(handleSpy).toHaveBeenCalled();

          expect(LoggerFlushSpy).toHaveBeenCalled();
        });
      });
    });
  });
});
