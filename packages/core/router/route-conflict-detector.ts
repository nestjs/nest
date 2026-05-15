import {
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import type { VersionValue } from '@nestjs/common/internal';
import { MatchFunction, Token, match, parse } from 'path-to-regexp';

type RouteHost = string | RegExp | Array<string | RegExp> | undefined;

export interface RouteConflictEntry {
  path: string;
  normalizedPath: string;
  requestMethod: RequestMethod;
  className: string;
  methodName: string;
  moduleKey: string;
  host?: RouteHost;
  version?: VersionValue;
  versioningOptions?: VersioningOptions;
}

export interface RouteConflict {
  current: RouteConflictEntry;
  previous: RouteConflictEntry;
  message: string;
}

interface RegisteredRoute extends RouteConflictEntry {
  matcher: MatchFunction<any>;
  signature: string;
  specificity: number;
}

const PARAM_PROBE_VALUE = '__nest_route_param__';
const WILDCARD_PROBE_VALUE = '__nest_route_wildcard__';
const MAX_PROBE_PATHS = 16;

export function isRouteConflictDetectionCompatibleAdapter(adapter: {
  getType?: () => string;
}): boolean {
  return adapter.getType?.() !== 'fastify';
}

export class RouteConflictDetector {
  private readonly registeredRoutes: RegisteredRoute[] = [];

  public register(route: RouteConflictEntry): RouteConflict[] {
    let tokens: Token[];
    let matcher: MatchFunction<any>;

    try {
      tokens = parse(route.normalizedPath).tokens;
      matcher = match(route.normalizedPath, { decode: false });
    } catch {
      return [];
    }

    const registeredRoute: RegisteredRoute = {
      ...route,
      matcher,
      signature: this.getRouteSignature(tokens),
      specificity: this.getRouteSpecificity(tokens),
    };
    const probePaths = this.createProbePaths(tokens);
    const conflicts = this.registeredRoutes
      .filter(previous =>
        this.isRouteConflict(previous, registeredRoute, probePaths),
      )
      .map(previous => ({
        previous,
        current: registeredRoute,
        message: this.createConflictMessage(previous, registeredRoute),
      }));

    this.registeredRoutes.push(registeredRoute);
    return conflicts;
  }

  private isRouteConflict(
    previous: RegisteredRoute,
    current: RegisteredRoute,
    probePaths: string[],
  ): boolean {
    if (
      !this.areRequestMethodsCompatible(
        previous.requestMethod,
        current.requestMethod,
      ) ||
      !this.areHostsCompatible(previous.host, current.host) ||
      !this.areVersionsCompatible(previous, current)
    ) {
      return false;
    }

    if (previous.normalizedPath === current.normalizedPath) {
      return true;
    }

    if (previous.specificity > current.specificity) {
      return false;
    }

    if (previous.signature === current.signature) {
      return true;
    }

    return probePaths.some(probePath => previous.matcher(probePath) !== false);
  }

  private areRequestMethodsCompatible(
    previous: RequestMethod,
    current: RequestMethod,
  ): boolean {
    return (
      previous === current ||
      previous === RequestMethod.ALL ||
      current === RequestMethod.ALL
    );
  }

  private areHostsCompatible(previous?: RouteHost, current?: RouteHost) {
    if (!previous || !current) {
      return true;
    }

    const previousHosts = Array.isArray(previous) ? previous : [previous];
    const currentHosts = Array.isArray(current) ? current : [current];

    return previousHosts.some(previousHost =>
      currentHosts.some(currentHost =>
        this.areHostEntriesCompatible(previousHost, currentHost),
      ),
    );
  }

  private areHostEntriesCompatible(
    previous: string | RegExp,
    current: string | RegExp,
  ): boolean {
    if (typeof previous === 'string' && typeof current === 'string') {
      return previous === current;
    }

    if (previous instanceof RegExp && current instanceof RegExp) {
      return (
        previous.source === current.source && previous.flags === current.flags
      );
    }

    if (previous instanceof RegExp && typeof current === 'string') {
      previous.lastIndex = 0;
      return previous.test(current);
    }

    if (typeof previous === 'string' && current instanceof RegExp) {
      current.lastIndex = 0;
      return current.test(previous);
    }

    return false;
  }

  private areVersionsCompatible(
    previous: RouteConflictEntry,
    current: RouteConflictEntry,
  ): boolean {
    if (
      previous.versioningOptions?.type === VersioningType.URI ||
      current.versioningOptions?.type === VersioningType.URI
    ) {
      return true;
    }

    if (!previous.version || !current.version) {
      return true;
    }

    const previousVersions = this.toVersionArray(previous.version);
    const currentVersions = this.toVersionArray(current.version);

    return previousVersions.some(previousVersion =>
      currentVersions.some(
        currentVersion =>
          previousVersion === VERSION_NEUTRAL ||
          currentVersion === VERSION_NEUTRAL ||
          previousVersion === currentVersion,
      ),
    );
  }

  private toVersionArray(version: VersionValue) {
    return Array.isArray(version) ? version : [version];
  }

  private createProbePaths(tokens: Token[]): string[] {
    return this.expandTokens(tokens)
      .map(path => path || '/')
      .slice(0, MAX_PROBE_PATHS);
  }

  private expandTokens(tokens: Token[]): string[] {
    return tokens.reduce(
      (paths, token) => this.combinePathParts(paths, this.expandToken(token)),
      [''],
    );
  }

  private expandToken(token: Token): string[] {
    switch (token.type) {
      case 'text':
        return [token.value];
      case 'param':
        return [PARAM_PROBE_VALUE];
      case 'wildcard':
        return [WILDCARD_PROBE_VALUE, `${WILDCARD_PROBE_VALUE}/child`];
      case 'group':
        return ['', ...this.expandTokens(token.tokens)];
    }
  }

  private combinePathParts(paths: string[], parts: string[]): string[] {
    return paths.flatMap(path => parts.map(part => path + part));
  }

  private getRouteSignature(tokens: Token[]): string {
    return tokens
      .map(token => {
        switch (token.type) {
          case 'text':
            return `text:${token.value}`;
          case 'param':
            return ':';
          case 'wildcard':
            return '*';
          case 'group':
            return `{${this.getRouteSignature(token.tokens)}}`;
        }
      })
      .join('');
  }

  private getRouteSpecificity(tokens: Token[]): number {
    return tokens.reduce((score, token) => {
      switch (token.type) {
        case 'text':
          return score + this.getStaticPathScore(token.value);
        case 'param':
          return score - 2;
        case 'wildcard':
          return score - 20;
        case 'group':
          return score + this.getRouteSpecificity(token.tokens);
      }
    }, 0);
  }

  private getStaticPathScore(value: string): number {
    const staticCharacters = value.replace(/\//g, '').length;
    const staticSegments = value.split('/').filter(Boolean).length;

    return staticCharacters * 10 + staticSegments * 3;
  }

  private createConflictMessage(
    previous: RouteConflictEntry,
    current: RouteConflictEntry,
  ): string {
    return (
      'Ambiguous route shadowing detected. ' +
      `${this.formatRoute(previous)} may shadow ${this.formatRoute(current)}. ` +
      'Declare the more specific route first or change one of the paths.'
    );
  }

  private formatRoute(route: RouteConflictEntry): string {
    return (
      `${RequestMethod[route.requestMethod]} ${route.path} ` +
      `(${route.className}.${route.methodName})`
    );
  }
}
