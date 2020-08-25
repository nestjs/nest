export interface Resolver {
  resolve(instance: any, basePath: string, isDisableRouterLog?: boolean): void;
  registerNotFoundHandler(): void;
  registerExceptionHandler(): void;
}
