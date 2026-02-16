import { Readable } from 'stream';
import { HttpStatus } from '../../enums/index.js';
import { StreamableFile } from '../../file-stream/index.js';

describe('StreamableFile', () => {
  describe('when input is a readable stream', () => {
    it('should assign it to a stream class property', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.getStream()).toBe(stream);
    });
  });
  describe('when input is an object with "pipe" method', () => {
    it('should assign it to a stream class property', () => {
      const stream = { pipe: () => {} };
      const streamableFile = new StreamableFile(stream as any);
      expect(streamableFile.getStream()).toBe(stream);
    });
  });
  describe('when input is neither Uint8Array nor has pipe method', () => {
    it('should not set stream property', () => {
      const invalidInput = { notPipe: true };
      const streamableFile = new StreamableFile(invalidInput as any);
      expect(streamableFile.getStream()).toBeUndefined();
    });
  });
  describe('when options is empty', () => {
    it('should return application/octet-stream for type and undefined for others', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.getHeaders()).toEqual({
        type: 'application/octet-stream',
        disposition: undefined,
        length: undefined,
      });
    });
  });
  describe('when options is defined', () => {
    it('should pass provided headers', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream, {
        type: 'application/pdf',
        disposition: 'inline',
        length: 100,
      });
      expect(streamableFile.getHeaders()).toEqual({
        type: 'application/pdf',
        disposition: 'inline',
        length: 100,
      });
    });
  });
  describe('otherwise', () => {
    describe('when input is a Buffer instance', () => {
      it('should create a readable stream and push the input buffer', () => {
        const buffer = Buffer.from('test');
        const streamableFile = new StreamableFile(buffer);
        const stream = streamableFile.getStream();
        expect(stream.read()).toBe(buffer);
      });
    });
    describe('when input is a Uint8Array', () => {
      it('should create a readable stream and push the input buffer', () => {
        const buffer = Uint8Array.from([0xab, 0xcd, 0xef, 0x00]);
        const streamableFile = new StreamableFile(buffer);
        const stream = streamableFile.getStream();
        expect(stream.read()).toEqual(Buffer.from(buffer));
      });
    });
  });

  describe('errorHandler', () => {
    it('should return the default error handler', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.errorHandler).toBeTypeOf('function');
    });

    describe('default error handler behavior', () => {
      it('should do nothing when response is destroyed', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const res = {
          destroyed: true,
          headersSent: false,
          statusCode: 200,
          end: vi.fn(),
          send: vi.fn(),
        };

        streamableFile.errorHandler(new Error('test error'), res as any);

        expect(res.end).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
      });

      it('should call res.end() when headers are already sent', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const res = {
          destroyed: false,
          headersSent: true,
          statusCode: 200,
          end: vi.fn(),
          send: vi.fn(),
        };

        streamableFile.errorHandler(new Error('test error'), res as any);

        expect(res.end).toHaveBeenCalledOnce();
        expect(res.send).not.toHaveBeenCalled();
      });

      it('should set status code to BAD_REQUEST and send error message', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const res = {
          destroyed: false,
          headersSent: false,
          statusCode: 200,
          end: vi.fn(),
          send: vi.fn(),
        };
        const error = new Error('test error message');

        streamableFile.errorHandler(error, res as any);

        expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(res.send).toHaveBeenCalledWith('test error message');
      });
    });
  });

  describe('setErrorHandler', () => {
    it('should set a custom error handler', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customHandler = vi.fn();

      streamableFile.setErrorHandler(customHandler);

      expect(streamableFile.errorHandler).toBe(customHandler);
    });

    it('should return the instance for chaining', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customHandler = vi.fn();

      const result = streamableFile.setErrorHandler(customHandler);

      expect(result).toBe(streamableFile);
    });
  });

  describe('errorLogger', () => {
    it('should return the default error logger', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.errorLogger).toBeTypeOf('function');
    });

    describe('default error logger behavior', () => {
      it('should call logger.error with the error', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const loggerErrorStub = vi.spyOn(
          (streamableFile as any).logger,
          'error',
        );
        const error = new Error('test error');

        streamableFile.errorLogger(error);

        expect(loggerErrorStub).toHaveBeenCalledWith(error);
        loggerErrorStub.mockRestore();
      });
    });
  });

  describe('setErrorLogger', () => {
    it('should set a custom error logger', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customLogger = vi.fn();

      streamableFile.setErrorLogger(customLogger);

      expect(streamableFile.errorLogger).toBe(customLogger);
    });

    it('should return the instance for chaining', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customLogger = vi.fn();

      const result = streamableFile.setErrorLogger(customLogger);

      expect(result).toBe(streamableFile);
    });
  });

  describe('auto-length from Uint8Array', () => {
    it('should auto-populate length from Buffer when not provided', () => {
      const buffer = Buffer.from('hello world');
      const streamableFile = new StreamableFile(buffer);

      expect(streamableFile.getHeaders().length).toBe(buffer.length);
    });

    it('should auto-populate length from Uint8Array when not provided', () => {
      const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
      const streamableFile = new StreamableFile(uint8);

      expect(streamableFile.getHeaders().length).toBe(5);
    });

    it('should not override explicitly provided length', () => {
      const buffer = Buffer.from('hello');
      const streamableFile = new StreamableFile(buffer, { length: 999 });

      expect(streamableFile.getHeaders().length).toBe(999);
    });
  });

  describe('getStream', () => {
    it('should return a Readable stream from Uint8Array input', () => {
      const streamableFile = new StreamableFile(new Uint8Array([1, 2, 3]));
      const stream = streamableFile.getStream();
      expect(stream).toBeInstanceOf(Readable);
    });

    it('should return the original Readable when constructed from a stream', () => {
      const readable = new Readable({ read() {} });
      const streamableFile = new StreamableFile(readable);
      expect(streamableFile.getStream()).toBe(readable);
    });
  });
});
