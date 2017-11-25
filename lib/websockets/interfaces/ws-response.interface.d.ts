export interface WsResponse<T> {
    event: string;
    data: T;
}
