export interface ExpressMiddleware {
  (req?: any, res?: any, next?: any): void;
}
