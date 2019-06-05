export interface RequestContext<T = any> {
  pattern: string | Record<string, any>;
  data: T;
}
