import { NestContainer, NestApplicationContext } from '@nestjs/core';
import { AbstractWsAdapter } from '../../adapters/ws-adapter.js';

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

    expect(new TestAdapter(httpServer).getHttpServer()).toBe(httpServer);
  });

  it('should have no HTTP server for an application without one, e.g. a standalone microservice', () => {
    const context = new NestApplicationContext(new NestContainer());

    expect(new TestAdapter(context).getHttpServer()).toBeUndefined();
  });
});
