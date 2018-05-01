import { Observable, Observer } from 'rxjs';
import { ReadPacket, PacketId, WritePacket, ClientOptions } from './../interfaces';
export declare abstract class ClientProxy {
    abstract close(): any;
    protected abstract publish(packet: ReadPacket, callback: (packet: WritePacket) => void): any;
    send<T = any>(pattern: any, data: any): Observable<T>;
    protected createObserver<T>(observer: Observer<T>): (packet: WritePacket) => void;
    protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId;
    protected getOptionsProp<T extends {
        options?;
    }>(obj: ClientOptions, prop: keyof T['options'], defaultValue?: any): any;
}
