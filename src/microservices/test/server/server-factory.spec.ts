import {expect} from 'chai';

import {Transport} from '../../enums/transport.enum';
import {ServerFactory} from '../../server/server-factory';
import {ServerRedis} from '../../server/server-redis';
import {ServerTCP} from '../../server/server-tcp';

describe('ServerFactory', () => {
  describe('create', () => {
    it(`should return tcp server by default`, () => {
      expect(ServerFactory.create({}) instanceof ServerTCP).to.be.true;
    });
    it(`should return redis server if transport is set to redis`, () => {
      expect(ServerFactory.create({transport : Transport.REDIS}) instanceof
             ServerRedis)
          .to.be.true;
    });
  });
});