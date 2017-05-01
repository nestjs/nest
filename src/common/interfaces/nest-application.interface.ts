export interface INestApplication {
    listen(port: number, callback?: () => void);
}