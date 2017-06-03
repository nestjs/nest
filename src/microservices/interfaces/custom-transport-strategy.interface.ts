export interface CustomTransportStrategy {
    listen(callback: () => void);
    close();
}