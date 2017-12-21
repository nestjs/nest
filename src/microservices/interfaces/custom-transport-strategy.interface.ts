export interface CustomTransportStrategy {
    listen(callback: () => void): void;
    close(): void;
}
