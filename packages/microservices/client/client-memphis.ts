import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  MemphisConsumerOptions,
  MemphisStationOptions,
} from '../external/memphis.interface';
import { MemphisOptions, ReadPacket, WritePacket } from '../interfaces';
import { ClientProxy } from './client-proxy';

let memphisPackage: any = {};
type Consumer = any;
type Producer = any;
type Station = any;

export class ClientMemphis extends ClientProxy {
  private connection: any;

  constructor(private readonly options: MemphisOptions['options']) {
    super();

    memphisPackage = loadPackage('memphis-dev', ClientMemphis.name, () =>
      require('memphis-dev'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async connect(): Promise<any> {
    if (!this.connection) {
      this.connection = await memphisPackage.connect(this.options);
    }

    return this.connection;
  }

  public close() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  protected publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void,
  ): () => void {
    throw new Error('Method not implemented.');
  }

  protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
    throw new Error('Method not implemented.');
  }

  /**
   * Attaches a schema to an existing station.
   * @param {String} name - schema name.
   * @param {String} stationName - station name to attach schema to.
   */
  async attachSchema({
    name,
    stationName,
  }: {
    name: string;
    stationName: string;
  }): Promise<void> {
    if (!this.connection) await this.connect();

    await this.connection.attachSchema({ name, stationName });
  }

  /**
   * Creates a consumer.
   *
   * @param {MemphisConsumerOptions} options - Configuration for the consumer.
   * @param {object} context - Context object.
   */
  async consumer(
    options: MemphisConsumerOptions,
    context: object = {},
  ): Promise<Consumer> {
    if (!this.connection) await this.connect();

    return await this.connection.consumer(options, context);
  }

  /**
   * Detaches a schema from staton.
   * @param {String} stationName - station name to attach schema to.
   */
  async detachSchema({ stationName }: { stationName: string }): Promise<void> {
    if (!this.connection) await this.connect();

    await this.connection.attachSchema({ stationName });
  }

  /**
   * Creates a producer.
   * @param {String} stationName - station name to produce messages into.
   * @param {String} producerName - name for the producer.
   * @param {String} genUniqueSuffix - Indicates memphis to add a unique
   * suffix to the desired producer name.
   */
  async producer({
    stationName,
    producerName,
    genUniqueSuffix = false,
  }: {
    stationName: string;
    producerName: string;
    genUniqueSuffix?: boolean;
  }): Promise<Producer> {
    if (!this.connection) await this.connect();

    return await this.connection.producer({
      stationName,
      producerName,
      genUniqueSuffix,
    });
  }

  public async sendNotification(
    title: string,
    msg: string,
    failedMsg: any,
    type: string,
  ) {
    if (!this.connection) await this.connect();

    this.connection.sendNotification(title, msg, failedMsg, type);
  }

  /**
   * Create a station.
   *
   * @param {MemphisStationOptions} options - Configuration for the station.
   */
  async station(options: MemphisStationOptions): Promise<Station> {
    if (!this.connection) await this.connection;

    return await this.connection.station(options);
  }
}
