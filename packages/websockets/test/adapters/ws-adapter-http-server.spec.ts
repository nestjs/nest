import { NestApplicationContext, NestContainer } from '@nestjs/core';
import { expect } from 'chai';
import { AbstractWsAdapter } from '../../adapters/ws-adapter';

class TestAdapter extends AbstractWsAdapter {
  public create() {}
  public bindMessageHandlers() {}
  public getHttpServer() {
    return this.httpServer;
  }
}

describe('AbstractWsAdapter', () => {
  it('should take an HTTP server it is given', () => {
    const httpServer = { listen: () => undefined };

    expect(new TestAdapter(httpServer).getHttpServer()).to.equal(httpServer);
  });

  it('should have no HTTP server for an application without one, e.g. a standalone microservice', () => {
    const context = new NestApplicationContext(new NestContainer());

    expect(new TestAdapter(context).getHttpServer()).to.be.undefined;
  });
});
