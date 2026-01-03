export interface Resolver {
  resolve(instance: any, basePath: string | string[]): void;
  registerNotFoundHandler(): void;
  registerExceptionHandler(): void;
}
