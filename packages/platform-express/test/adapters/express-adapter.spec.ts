import { BadRequestException } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

describe('ExpressAdapter', () => {
  afterEach(() => vi.restoreAllMocks());
  let expressAdapter: ExpressAdapter;

  beforeEach(() => {
    expressAdapter = new ExpressAdapter();
  });

  describe('registerParserMiddleware', () => {
    it('should register the express built-in parsers for json and urlencoded payloads', () => {
      const expressInstance = express();
      const jsonParserInstance = express.json();
      const urlencodedInstance = express.urlencoded();
      const jsonParserSpy = vi
        .spyOn(express, 'json')
        .mockReturnValue(jsonParserInstance as any);
      const urlencodedParserSpy = vi
        .spyOn(express, 'urlencoded')
        .mockReturnValue(urlencodedInstance as any);
      const useSpy = vi.spyOn(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.mockClear();

      expressAdapter.registerParserMiddleware();

      expect(useSpy).toHaveBeenCalledTimes(2);
      expect(useSpy).toHaveBeenCalledWith(jsonParserInstance);
      expect(useSpy).toHaveBeenCalledWith(urlencodedInstance);
      expect(jsonParserSpy).toHaveBeenCalledWith({});
      expect(urlencodedParserSpy).toHaveBeenCalledWith({ extended: true });
    });

    it('should not register default parsers if custom parsers have already been registered', () => {
      const expressInstance = express();
      expressInstance.use(function jsonParser() {});
      expressInstance.use(function urlencodedParser() {});
      const useSpy = vi.spyOn(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.mockClear();

      expressAdapter.registerParserMiddleware();

      expect(useSpy).not.toHaveBeenCalled();
    });
  });

  describe('reply', () => {
    const createResponse = () => ({
      status: vi.fn(),
      send: vi.fn(),
      json: vi.fn(),
      getHeader: vi.fn(),
      setHeader: vi.fn(),
    });

    it('should apply the given status code', () => {
      const response = createResponse();

      expressAdapter.reply(response, { message: 'Oops' }, 404);

      expect(response.status).toHaveBeenCalledWith(404);
    });

    it('should not apply any status code when it is omitted', () => {
      const response = createResponse();

      expressAdapter.reply(response, { message: 'Hello' });

      expect(response.status).not.toHaveBeenCalled();
    });

    it('should apply falsy status codes instead of dropping them', () => {
      // "0" and "NaN" are falsy, but they were still passed in. Forwarding them
      // lets express reject the value, whereas skipping the call leaves the
      // status that was set before the handler ran (200/201), so an error would
      // be sent with a successful status code.
      for (const statusCode of [0, NaN]) {
        const response = createResponse();

        expressAdapter.reply(response, { message: 'Oops' }, statusCode);

        expect(response.status).toHaveBeenCalledWith(statusCode);
      }
    });
  });

  describe('mapException', () => {
    it('should map URIError with status code to BadRequestException', () => {
      const error = new URIError();
      const result = expressAdapter.mapException(error) as BadRequestException;
      expect(result).toBeInstanceOf(BadRequestException);
    });

    it('should map SyntaxError with status code to BadRequestException', () => {
      const error = new SyntaxError();
      const result = expressAdapter.mapException(error) as BadRequestException;
      expect(result).toBeInstanceOf(BadRequestException);
    });

    it('should return error if it is not handler Error', () => {
      const error = new Error('Test error');
      const result = expressAdapter.mapException(error);
      expect(result).toBe(error);
    });
  });
});
