export interface NestMiddleware {
    resolve(...args): (req?, res?, next?) => void;
}