export interface INestMicroservice {
    listen(callback: () => void);
    close(): void;
}