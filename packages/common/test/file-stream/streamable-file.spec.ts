import { expect } from 'chai';
import * as sinon from 'sinon';
import { Readable } from 'stream';
import { StreamableFile } from '../../file-stream';
import { HttpStatus } from '../../enums';

describe('StreamableFile', () => {
  describe('when input is a readable stream', () => {
    it('should assign it to a stream class property', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.getStream()).to.equal(stream);
    });
  });
  describe('when input is an object with "pipe" method', () => {
    it('should assign it to a stream class property', () => {
      const stream = { pipe: () => {} };
      const streamableFile = new StreamableFile(stream as any);
      expect(streamableFile.getStream()).to.equal(stream);
    });
  });
  describe('when input is neither Uint8Array nor has pipe method', () => {
    it('should not set stream property', () => {
      const invalidInput = { notPipe: true };
      const streamableFile = new StreamableFile(invalidInput as any);
      expect(streamableFile.getStream()).to.be.undefined;
    });
  });
  describe('when options is empty', () => {
    it('should return application/octet-stream for type and undefined for others', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.getHeaders()).to.deep.equal({
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
      expect(streamableFile.getHeaders()).to.deep.equal({
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
        expect(stream.read()).to.equal(buffer);
      });
    });
    describe('when input is a Uint8Array', () => {
      it('should create a readable stream and push the input buffer', () => {
        const buffer = Uint8Array.from([0xab, 0xcd, 0xef, 0x00]);
        const streamableFile = new StreamableFile(buffer);
        const stream = streamableFile.getStream();
        expect(stream.read()).to.deep.equal(Buffer.from(buffer));
      });
    });
  });

  describe('errorHandler', () => {
    it('should return the default error handler', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.errorHandler).to.be.a('function');
    });

    describe('default error handler behavior', () => {
      it('should do nothing when response is destroyed', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const res = {
          destroyed: true,
          headersSent: false,
          statusCode: 200,
          end: sinon.spy(),
          send: sinon.spy(),
        };

        streamableFile.errorHandler(new Error('test error'), res as any);

        expect(res.end.called).to.be.false;
        expect(res.send.called).to.be.false;
      });

      it('should call res.end() when headers are already sent', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const res = {
          destroyed: false,
          headersSent: true,
          statusCode: 200,
          end: sinon.spy(),
          send: sinon.spy(),
        };

        streamableFile.errorHandler(new Error('test error'), res as any);

        expect(res.end.calledOnce).to.be.true;
        expect(res.send.called).to.be.false;
      });

      it('should set status code to BAD_REQUEST and send error message', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const res = {
          destroyed: false,
          headersSent: false,
          statusCode: 200,
          end: sinon.spy(),
          send: sinon.spy(),
        };
        const error = new Error('test error message');

        streamableFile.errorHandler(error, res as any);

        expect(res.statusCode).to.equal(HttpStatus.BAD_REQUEST);
        expect(res.send.calledOnceWith('test error message')).to.be.true;
      });
    });
  });

  describe('setErrorHandler', () => {
    it('should set a custom error handler', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customHandler = sinon.spy();

      streamableFile.setErrorHandler(customHandler);

      expect(streamableFile.errorHandler).to.equal(customHandler);
    });

    it('should return the instance for chaining', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customHandler = sinon.spy();

      const result = streamableFile.setErrorHandler(customHandler);

      expect(result).to.equal(streamableFile);
    });
  });

  describe('errorLogger', () => {
    it('should return the default error logger', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.errorLogger).to.be.a('function');
    });

    describe('default error logger behavior', () => {
      it('should call logger.error with the error', () => {
        const stream = new Readable();
        const streamableFile = new StreamableFile(stream);
        const loggerErrorStub = sinon.stub(
          (streamableFile as any).logger,
          'error',
        );
        const error = new Error('test error');

        streamableFile.errorLogger(error);

        expect(loggerErrorStub.calledOnceWith(error)).to.be.true;
        loggerErrorStub.restore();
      });
    });
  });

  describe('setErrorLogger', () => {
    it('should set a custom error logger', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customLogger = sinon.spy();

      streamableFile.setErrorLogger(customLogger);

      expect(streamableFile.errorLogger).to.equal(customLogger);
    });

    it('should return the instance for chaining', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      const customLogger = sinon.spy();

      const result = streamableFile.setErrorLogger(customLogger);

      expect(result).to.equal(streamableFile);
    });
  });
});
