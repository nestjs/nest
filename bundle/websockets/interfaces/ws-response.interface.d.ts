export interface WsResponse<T = any> {
    event: string;
    data: T;
}
