export interface CustomTransportStrategy {
    listen(callback: () => void): any;
    close(): any;
}
