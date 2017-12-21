import { expect } from 'chai';
import { ClientProxyFactory } from '../../client/client-proxy-factory';
import { ClientTCP } from '../../client/client-tcp';
import { Transport } from '../../enums/transport.enum';
import { ClientRedis } from '../../client/client-redis';

describe('ClientProxyFactory', () => {
  describe('create', () => {
    it(`should create tcp client by default`, () => {
      const proxy = ClientProxyFactory.create({});
      expect(proxy instanceof ClientTCP).to.be.true;
    });

    it(`should create redis client`, () => {
      const proxy = ClientProxyFactory.create({ transport: Transport.REDIS });
      expect(proxy instanceof ClientRedis).to.be.true;
    });
  });
});
