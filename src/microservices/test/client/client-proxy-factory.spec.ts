import {expect} from 'chai';

import {ClientProxyFactory} from '../../client/client-proxy-factory';
import {ClientRedis} from '../../client/client-redis';
import {ClientTCP} from '../../client/client-tcp';
import {Transport} from '../../enums/transport.enum';

describe('ClientProxyFactory', () => {
  describe('create', () => {
    it(`should create tcp client by default`, () => {
      const proxy = ClientProxyFactory.create({});
      expect(proxy instanceof ClientTCP).to.be.true;
    });

    it(`should create redis client`, () => {
      const proxy = ClientProxyFactory.create({transport : Transport.REDIS});
      expect(proxy instanceof ClientRedis).to.be.true;
    });
  });
});