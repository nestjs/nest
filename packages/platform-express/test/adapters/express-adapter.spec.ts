import { ExpressAdapter } from '@nestjs/platform-express';
import { expect } from 'chai';
import * as express from 'express';
import * as sinon from 'sinon';

describe('ExpressAdapter', () => {
  afterEach(() => sinon.restore());

  describe('registerParserMiddleware', () => {
    it('should register the express built-in parsers for json and urlencoded payloads', () => {
      const expressInstance = express();
      const jsonParserInstance = express.json();
      const urlencodedInstance = express.urlencoded();
      const jsonParserSpy = sinon
        .stub(express, 'json')
        .returns(jsonParserInstance);
      const urlencodedParserSpy = sinon
        .stub(express, 'urlencoded')
        .returns(urlencodedInstance);
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);

      expressAdapter.registerParserMiddleware();

      expect(useSpy.calledTwice).to.be.true;
      expect(useSpy.calledWith(sinon.match.same(jsonParserInstance))).to.be
        .true;
      expect(useSpy.calledWith(sinon.match.same(urlencodedInstance))).to.be
        .true;
      expect(jsonParserSpy.calledOnceWith({})).to.be.true;
      expect(urlencodedParserSpy.calledOnceWith({ extended: true })).to.be.true;
    });

    it('should not register default parsers if custom parsers have already been registered', () => {
      const expressInstance = express();
      expressInstance.use(function jsonParser() {});
      expressInstance.use(function urlencodedParser() {});
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);

      expressAdapter.registerParserMiddleware();

      expect(useSpy.called).to.be.false;
    });
  });
});
