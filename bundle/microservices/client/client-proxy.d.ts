import { Observable, Observer } from 'rxjs';
import { ClientOptions, PacketId, ReadPacket, WritePacket } from '../interfaces';
export declare abstract class ClientProxy {
    abstract connect(): Promise<any>;
    abstract close(): any;
    protected routingMap: Map<string, Function>;
    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult>;
    protected abstract publish(packet: ReadPacket, callback: (packet: WritePacket) => void): Function | void;
    protected createObserver<T>(observer: Observer<T>): (packet: WritePacket) => void;
    protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId;
    protected connect$(instance: any, errorEvent?: string, connectEvent?: string): Observable<any>;
    protected getOptionsProp<T extends {
        options?;
    }>(obj: ClientOptions['options'], prop: keyof T['options'], defaultValue?: any): any;
    protected normalizePattern<T = any>(pattern: T): string;
}
