export interface PacketId {
    id: string;
}
export interface ReadPacket<T = any> {
    pattern: any;
    data: T;
}
export interface WritePacket<T = any> {
    err?: any;
    response?: T;
    isDisposed?: boolean;
}
