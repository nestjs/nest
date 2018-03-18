import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { ReadPacket, PacketId, WritePacket } from './../interfaces';
export declare abstract class ClientProxy {
    protected abstract publish(packet: ReadPacket, callback: (packet: WritePacket) => void): any;
    send<T>(pattern: any, data: any): Observable<T>;
    protected createObserver<T>(observer: Observer<T>): (packet: WritePacket) => void;
    protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId;
}
