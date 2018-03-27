import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import {
  ReadPacket,
  PacketId,
  WritePacket,
  ClientOptions,
} from './../interfaces';
export abstract class ClientProxy {
  abstract close(): any;
  protected abstract publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): any;
  send<T>(pattern: any, data: any): Observable<T>;
  protected loadPackage(name: string, ctx: string): any;
  protected createObserver<T>(
    observer: Observer<T>,
  ): (packet: WritePacket) => void;
  protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId;
  protected getOptionsProp<
    T extends {
      options?;
    }
  >(obj: ClientOptions, prop: keyof T['options'], defaultValue?: any): any;
}
