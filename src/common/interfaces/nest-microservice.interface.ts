export interface INestMicroservice {
    listen(callback: () => void);
}