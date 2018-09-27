declare module 'yaml' {
  export function stringify(data: object): string;
  export function parse<T extends Object>(data: string): T;
}
