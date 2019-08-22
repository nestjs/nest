import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { ServerTCP } from '../../server/server-tcp';
import { ServerKafka } from '../../server';
import { Consumer, IHeaders, KafkaMessage } from '../../external/kafka.interface';

describe('ServerKafka', () => {
  let server: ServerKafka;

  beforeEach(() => {
    server = new ServerKafka({});
  });

  afterEach(() => {
    server.close();
  });
  // describe('close', () => {
  //   it('should close server', () => {
  //     server.close();
  //     expect(server.consumer).to.be.null;
  //     expect(server.producer).to.be.null;
  //     expect(server.client).to.be.null;
  //   });
  // });
  // describe('listen', () => {
  //   it('should start server', async () => {
  //     const callback = sinon.spy();
  //     await server.listen(callback);
  //     expect(callback.called).to.be.true;
  //   });
  //   it('should have kafka, producer and consumer connected', async () => {
  //     await server.listen(() => {});
  //     expect(server.client).to.be.not.null;
  //     expect(server.producer).to.be.not.null;
  //     expect(server.consumer).to.be.not.null;
  //   });
  // });
});
