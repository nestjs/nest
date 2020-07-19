import { isObject } from '@nestjs/common/utils/shared.utils';

export class RouteAliasResolver {
  private readonly aliasMap: Map<string | Symbol, string[]>
  constructor() {
    this.aliasMap = new Map()
  }
  public register(alias: string | Symbol, basePath: string, path: string[]) {
    if (this.aliasMap.has(alias)) {
      throw new Error(`Conflict ${alias} already registered`);
    }
    this.aliasMap.set(alias, this.createPath(basePath, path));
  }
  public createResolveFn() {
    const resolveFn = this.resolve.bind(this);
    return function(alias: string | Symbol, params?: object) {
      return resolveFn(alias, params)
    }
  }
  private resolve(alias: string | Symbol, params?: object): string {
    if (!this.aliasMap.has(alias)) {
      throw new Error(`Not Found: ${alias} not registered`);
    }

    return this.aliasMap.get(alias).reduce((path, part) => {
      if (part.startsWith(':') && isObject(params)) {
        const paramValue = params[part.replace(':', '')];
        return path + '/' + (paramValue !== undefined ? paramValue : part);
      }
      return part ? path + '/' + part : path;
    }, '');
  }
  private createPath(basePath: string, path: string[]): string[] {
    const base = basePath ? [this.stripSlashes(basePath)] : [];
    return base.concat(this.splitPath(path))
  }
  private splitPath(path: string[]): string[] {
    const pathParts = [];
    path.forEach(part => {
      part.split('/').forEach(partial => {
        partial && pathParts.push(this.stripSlashes(partial));
      });
    });
    return pathParts;
  }
  private stripSlashes(str: string) {
    return str.replace(/^\/?(.*)\/?$/, '$1')
  }
}