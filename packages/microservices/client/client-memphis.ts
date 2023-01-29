import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { MemphisOptions, ReadPacket, WritePacket } from '../interfaces';
import { ClientProxy } from './client-proxy';

let memphisPackage: any = {};

export class ClientMemphis extends ClientProxy {
  private connection: any;

  constructor(private readonly options: MemphisOptions['options']) {
    super();

    memphisPackage = loadPackage('memphis-dev', ClientMemphis.name, () =>
      require('memphis-dev')
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async connect(): Promise<any> {
    try {
      this.connection = await memphisPackage.connect(this.options);
    } catch (err) {
      console.log(err);
      this.close();
    }
  }

  public close() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  protected publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void
  ): () => void {
    throw new Error('Method not implemented.');
  }

  protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
    throw new Error('Method not implemented.');
  }
}
