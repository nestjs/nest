export interface INestApplication {
    init(): void;
    listen(port: number, callback?: (server?) => void): void;
    setGlobalPrefix(prefix: string): void;
}