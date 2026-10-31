import {
  Logger,
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningType,
  type RouteConflictPolicy,
  type VersioningOptions,
} from '@nestjs/common';
import {
  parse,
  pathToRegexp,
  stringify,
  TokenData,
  type Parameter,
  type Text,
  type Token,
  type Wildcard,
} from 'path-to-regexp';
import { RouteConflictException } from '../errors/exceptions/route-conflict.exception.js';
import {
  DUPLICATE_ROUTE_MESSAGE,
  SHADOWED_ROUTE_MESSAGE,
} from '../errors/messages.js';
import { ResolvedRoute } from './interfaces/resolved-route.interface.js';
import { RouteConflict } from './interfaces/route-conflict.interface.js';

type SegmentKind = 'literal' | 'mixed' | 'param' | 'wildcard';

export interface PathSegment {
  kind: SegmentKind;
  value: string;
}

/**
 * A token of a path with its groups flattened, and whether it belongs to
 * an optional group.
 */
interface PathPart {
  token: Text | Parameter | Wildcard;
  optional: boolean;
}

/**
 * A segment as the detector compares it. A mixed one carries its matcher and
 * the text every segment it matches starts and ends with.
 */
type ComparableSegment =
  | { kind: Exclude<SegmentKind, 'mixed'>; value: string }
  | {
      kind: 'mixed';
      value: string;
      matcher: RegExp;
      start: string;
      end: string;
    };

/**
 * The segments of each variant of a path, one per combination of its
 * optional groups, and the text every path it matches starts with.
 */
interface ComparablePath {
  variants: ComparableSegment[][];
  leadingText: string;
}

// Each optional group doubles the number of path variants to compare
const MAX_EXPANDED_GROUPS = 6;

const joinText = (tokens: Token[]) =>
  tokens.map(token => (token.type === 'text' ? token.value : '')).join('');

/**
 * Static utility class that detects overlapping HTTP routes and reports
 * them according to a per-kind policy. Stateless — every method takes
 * everything it needs as parameters.
 */
export class RouteConflictDetector {
  /**
   * Tags each segment of a path as a literal, a named param, a named
   * wildcard, or a mix of text and params (`v:version`, `:name.:ext`).
   * Optional groups are read as present (`/users{/:id}` as `/users/:id`).
   * Paths path-to-regexp cannot match (such as `/files/*` or
   * `/files/:name:ext` on Fastify) are split on `/` and tagged by the
   * first character of each segment.
   */
  public static tokenizePath(rawPath: string): PathSegment[] {
    const tokens = RouteConflictDetector.parseTokens(rawPath);
    if (!tokens) {
      return RouteConflictDetector.splitPath(rawPath);
    }
    return RouteConflictDetector.toSegments(
      RouteConflictDetector.flattenGroups(tokens, false),
    );
  }

  /**
   * Tells whether two paths only differ by the names of their parameters and
   * wildcards (`/users/:id` and `/users/:username`, but not `/files/:id` and
   * `/files/:name.:ext`).
   */
  public static pathsHaveSameShape(
    leftPath: string,
    rightPath: string,
  ): boolean {
    const shapeOf = (path: string) =>
      JSON.stringify(parse(path).tokens, (key, value) =>
        key === 'name' ? undefined : value,
      );
    try {
      return shapeOf(leftPath) === shapeOf(rightPath);
    } catch {
      return false;
    }
  }

  /**
   * Tells whether two routes differ only by the names of their parameters
   * and wildcards, so that an adapter routing by path shape (Fastify)
   * registers them as one route and rejects the second.
   */
  public static routesRegisterAsSame(
    leftRoute: ResolvedRoute,
    rightRoute: ResolvedRoute,
    versioningOptions: VersioningOptions | undefined,
  ): boolean {
    return (
      leftRoute.method === rightRoute.method &&
      RouteConflictDetector.pathsHaveSameShape(
        leftRoute.path,
        rightRoute.path,
      ) &&
      RouteConflictDetector.hostsAreIdentical(
        leftRoute.host,
        rightRoute.host,
      ) &&
      RouteConflictDetector.versionsAreIdentical(
        leftRoute.version,
        rightRoute.version,
        versioningOptions,
      )
    );
  }

  /**
   * Decides whether two paths can match the same incoming request, given
   * only their declared patterns (no host/method/version considered).
   */
  public static pathsCanOverlap(leftPath: string, rightPath: string): boolean {
    return RouteConflictDetector.comparablePathsCanOverlap(
      RouteConflictDetector.toComparablePath(leftPath),
      RouteConflictDetector.toComparablePath(rightPath),
    );
  }

  private static comparablePathsCanOverlap(
    leftPath: ComparablePath,
    rightPath: ComparablePath,
  ): boolean {
    // Rules out most pairs before comparing every pair of variants
    if (
      !leftPath.leadingText.startsWith(rightPath.leadingText) &&
      !rightPath.leadingText.startsWith(leftPath.leadingText)
    ) {
      return false;
    }
    return leftPath.variants.some(leftSegments =>
      rightPath.variants.some(rightSegments =>
        RouteConflictDetector.segmentListsCanOverlap(
          leftSegments,
          rightSegments,
        ),
      ),
    );
  }

  private static segmentListsCanOverlap(
    leftSegments: ComparableSegment[],
    rightSegments: ComparableSegment[],
  ): boolean {
    const leftEndsInWildcard =
      leftSegments[leftSegments.length - 1]?.kind === 'wildcard';
    const rightEndsInWildcard =
      rightSegments[rightSegments.length - 1]?.kind === 'wildcard';

    // A named wildcard like `*path` requires at least one matched segment,
    // so only the *shorter* side's trailing wildcard can absorb the
    // difference. If the longer side has the wildcard, the other side
    // simply does not have enough segments to ever reach that position.
    if (leftSegments.length !== rightSegments.length) {
      const shorterEndsInWildcard =
        leftSegments.length < rightSegments.length
          ? leftEndsInWildcard
          : rightEndsInWildcard;
      if (!shorterEndsInWildcard) {
        return false;
      }
    }

    const sharedLength = Math.min(leftSegments.length, rightSegments.length);
    let canOverlap = true;

    leftSegments.slice(0, sharedLength).forEach((leftSegment, segmentIndex) => {
      if (!canOverlap) return;
      if (
        !RouteConflictDetector.segmentsCanOverlap(
          leftSegment,
          rightSegments[segmentIndex],
        )
      ) {
        canOverlap = false;
      }
    });

    return canOverlap;
  }

  /**
   * Walks every unique pair of resolved routes and produces a conflict
   * record for each pair whose (method, host, version, path) tuples can
   * collide at runtime.
   */
  public static detect(
    routes: ResolvedRoute[],
    versioningOptions: VersioningOptions | undefined,
  ): RouteConflict[] {
    const conflicts: RouteConflict[] = [];
    // Every route is compared with every other one: read each path once
    const comparablePaths = new Map(
      routes.map(route => [
        route.path,
        RouteConflictDetector.toComparablePath(route.path),
      ]),
    );

    RouteConflictDetector.forEachUniquePair(
      routes,
      (earlierRoute, laterRoute) => {
        if (
          !RouteConflictDetector.methodsCanOverlap(
            earlierRoute.method,
            laterRoute.method,
          )
        ) {
          return;
        }
        if (
          !RouteConflictDetector.versionsCanOverlap(
            earlierRoute.version,
            laterRoute.version,
            versioningOptions,
          )
        ) {
          return;
        }
        if (
          !RouteConflictDetector.hostsCanOverlap(
            earlierRoute.host,
            laterRoute.host,
          )
        ) {
          return;
        }
        if (
          !RouteConflictDetector.comparablePathsCanOverlap(
            comparablePaths.get(earlierRoute.path)!,
            comparablePaths.get(laterRoute.path)!,
          )
        ) {
          return;
        }

        const isIdentical = RouteConflictDetector.routesAreIdentical(
          earlierRoute,
          laterRoute,
          versioningOptions,
        );
        conflicts.push({
          winner: earlierRoute,
          shadowed: laterRoute,
          kind: isIdentical ? 'duplicate' : 'shadow',
        });
      },
    );

    return conflicts;
  }

  /**
   * Applies the per-kind policy to a set of conflicts: silences `'off'`,
   * logs `'warn'` once per conflict, and aggregates every `'error'`-level
   * conflict into a single `RouteConflictException`.
   */
  public static handle(
    conflicts: RouteConflict[],
    policy: RouteConflictPolicy | undefined,
    logger: Logger,
  ): void {
    if (conflicts.length === 0 || policy === undefined) return;

    const errorMessages: string[] = [];

    conflicts.forEach(conflict => {
      const policyForKind = policy[conflict.kind] ?? 'off';
      if (policyForKind === 'off') return;

      const message = RouteConflictDetector.describeConflict(conflict);

      if (policyForKind === 'warn') {
        logger.warn(message);
        return;
      }
      errorMessages.push(message);
    });

    if (errorMessages.length > 0) {
      throw new RouteConflictException(errorMessages);
    }
  }

  /**
   * Removes shadow conflicts that specificity sorting has already resolved.
   *
   * When `routeResolutionStrategy: 'specificity'` is active, the sort
   * promotes more-specific routes ahead of less-specific ones. A shadow
   * where the sort promoted the winner (it was declared *later* but sorted
   * *first*) is handled correctly at runtime — the more-specific route is
   * registered first and handles its requests while the less-specific route
   * handles the rest. Retaining such a conflict would cause `shadow: 'error'`
   * to abort an application whose routes actually work as intended.
   *
   * Shadows where the winner was already first in declaration order (the
   * sort did not swap them) are genuine and are kept unchanged. Duplicate
   * conflicts are always kept.
   *
   * @param conflicts     Conflicts detected on the sorted route list.
   * @param declarationOrder  Routes in their original declaration order
   *                          (i.e. before specificity sorting was applied).
   */
  public static filterSortResolvedShadows(
    conflicts: RouteConflict[],
    declarationOrder: ResolvedRoute[],
  ): RouteConflict[] {
    const declarationIndex = new Map(
      declarationOrder.map((route, idx) => [route, idx]),
    );
    return conflicts.filter(conflict => {
      if (conflict.kind !== 'shadow') return true;
      const winnerDeclIdx = declarationIndex.get(conflict.winner) ?? -1;
      const shadowedDeclIdx = declarationIndex.get(conflict.shadowed) ?? -1;
      // The sort promoted the winner (declared later, but sorted to the
      // front because it is more specific). The shadow is resolved at
      // runtime — drop it. Keep only genuine shadows where the winner was
      // already first in declaration order.
      return winnerDeclIdx < shadowedDeclIdx;
    });
  }

  private static segmentsCanOverlap(
    leftSegment: ComparableSegment,
    rightSegment: ComparableSegment,
  ): boolean {
    if (leftSegment.kind === 'wildcard' || rightSegment.kind === 'wildcard') {
      return true;
    }
    if (leftSegment.kind === 'param' || rightSegment.kind === 'param') {
      return true;
    }
    if (leftSegment.kind === 'mixed' && rightSegment.kind === 'mixed') {
      return (
        (leftSegment.start.startsWith(rightSegment.start) ||
          rightSegment.start.startsWith(leftSegment.start)) &&
        (leftSegment.end.endsWith(rightSegment.end) ||
          rightSegment.end.endsWith(leftSegment.end))
      );
    }
    if (leftSegment.kind === 'mixed') {
      return leftSegment.matcher.test(rightSegment.value);
    }
    if (rightSegment.kind === 'mixed') {
      return rightSegment.matcher.test(leftSegment.value);
    }
    return leftSegment.value === rightSegment.value;
  }

  /**
   * Paths path-to-regexp cannot match, or with more than
   * `MAX_EXPANDED_GROUPS` groups, are split on `/` instead.
   */
  private static toComparablePath(rawPath: string): ComparablePath {
    const tokens = RouteConflictDetector.parseTokens(rawPath);
    if (
      !tokens ||
      RouteConflictDetector.countGroups(tokens) > MAX_EXPANDED_GROUPS
    ) {
      return {
        variants: [
          RouteConflictDetector.splitPath(rawPath).map(
            RouteConflictDetector.toComparableSegment,
          ),
        ],
        leadingText: '',
      };
    }
    const firstNonText = tokens.findIndex(token => token.type !== 'text');
    return {
      variants: RouteConflictDetector.expandGroups(tokens).map(variant =>
        RouteConflictDetector.toSegments(
          variant.map(token => ({ token, optional: false })),
        ).map(RouteConflictDetector.toComparableSegment),
      ),
      // Slashes collapsed, as the segments ignore empty ones
      leadingText: `/${joinText(
        firstNonText === -1 ? tokens : tokens.slice(0, firstNonText),
      )}`.replace(/\/{2,}/g, '/'),
    };
  }

  private static toComparableSegment(segment: PathSegment): ComparableSegment {
    if (segment.kind !== 'mixed') {
      return { kind: segment.kind, value: segment.value };
    }
    // A segment matching this one starts with the text before its first
    // param and ends with the text after its last one
    const tokens = parse(segment.value).tokens;
    return {
      kind: 'mixed',
      value: segment.value,
      matcher: pathToRegexp(segment.value, { sensitive: true }).regexp,
      start: joinText(
        tokens.slice(
          0,
          tokens.findIndex(token => token.type !== 'text'),
        ),
      ),
      end: joinText(
        tokens.slice(tokens.findLastIndex(token => token.type !== 'text') + 1),
      ),
    };
  }

  private static parseTokens(rawPath: string): Token[] | undefined {
    try {
      // Also rejects what parse() accepts but cannot be matched, such as
      // `:name:ext`, which Fastify takes as a single param
      pathToRegexp(rawPath);
      return parse(rawPath).tokens;
    } catch {
      return undefined;
    }
  }

  private static countGroups(tokens: Token[]): number {
    return tokens.reduce(
      (count, token) =>
        token.type === 'group'
          ? count + 1 + RouteConflictDetector.countGroups(token.tokens)
          : count,
      0,
    );
  }

  private static expandGroups(
    tokens: Token[],
  ): Array<Array<Text | Parameter | Wildcard>> {
    return tokens.reduce<Array<Array<Text | Parameter | Wildcard>>>(
      (variants, token) => {
        if (token.type !== 'group') {
          return variants.map(variant => [...variant, token]);
        }
        const groupVariants = RouteConflictDetector.expandGroups(token.tokens);
        return variants.flatMap(variant => [
          variant,
          ...groupVariants.map(groupVariant => [...variant, ...groupVariant]),
        ]);
      },
      [[]],
    );
  }

  private static flattenGroups(tokens: Token[], optional: boolean): PathPart[] {
    return tokens.flatMap(token =>
      token.type === 'group'
        ? RouteConflictDetector.flattenGroups(token.tokens, true)
        : [{ token, optional }],
    );
  }

  private static toSegments(parts: PathPart[]): PathSegment[] {
    const segments: PathPart[][] = [[]];
    parts.forEach(part => {
      if (part.token.type !== 'text') {
        segments[segments.length - 1].push(part);
        return;
      }
      part.token.value.split('/').forEach((text, index) => {
        if (index > 0) {
          segments.push([]);
        }
        if (text.length > 0) {
          segments[segments.length - 1].push({
            token: { type: 'text', value: text },
            optional: part.optional,
          });
        }
      });
    });
    return segments
      .filter(segmentParts => segmentParts.length > 0)
      .map(segmentParts => RouteConflictDetector.classifySegment(segmentParts));
  }

  private static classifySegment(parts: PathPart[]): PathSegment {
    const tokens = parts.map(part => part.token);
    // After text, a wildcard is compared as a mixed segment, which keeps
    // `static*path` from overlapping `/users`
    if (tokens[0].type === 'wildcard') {
      return { kind: 'wildcard', value: tokens[0].name };
    }
    if (tokens.every(token => token.type === 'text')) {
      return {
        kind: 'literal',
        value: tokens.map(token => token.value).join(''),
      };
    }
    // An optional suffix does not narrow a param down: `:id{.:format}`
    // matches the same segments as `:id`
    const requiredParts = parts.filter(part => !part.optional);
    const [onlyPart, ...otherParts] =
      requiredParts.length > 0 ? requiredParts : parts;
    if (otherParts.length === 0 && onlyPart.token.type === 'param') {
      return { kind: 'param', value: onlyPart.token.name };
    }
    return { kind: 'mixed', value: stringify(new TokenData(tokens)) };
  }

  /**
   * Tags each `/`-separated segment by its first character, for the paths
   * that are not parsed with path-to-regexp.
   */
  private static splitPath(rawPath: string): PathSegment[] {
    return rawPath
      .split('/')
      .filter(rawSegment => rawSegment.length > 0)
      .map(rawSegment => {
        if (rawSegment.startsWith('*')) {
          return { kind: 'wildcard', value: rawSegment.slice(1) };
        }
        if (rawSegment.startsWith('{*') && rawSegment.endsWith('}')) {
          return { kind: 'wildcard', value: rawSegment.slice(2, -1) };
        }
        if (rawSegment.startsWith(':')) {
          return { kind: 'param', value: rawSegment.slice(1) };
        }
        return { kind: 'literal', value: rawSegment };
      });
  }

  private static methodsCanOverlap(
    leftMethod: RequestMethod,
    rightMethod: RequestMethod,
  ): boolean {
    if (leftMethod === RequestMethod.ALL || rightMethod === RequestMethod.ALL) {
      return true;
    }
    return leftMethod === rightMethod;
  }

  private static versionsCanOverlap(
    leftVersion: ResolvedRoute['version'],
    rightVersion: ResolvedRoute['version'],
    versioningOptions: VersioningOptions | undefined,
  ): boolean {
    if (!versioningOptions) return true;
    if (versioningOptions.type === VersioningType.URI) return true;

    const leftMatchesAnyVersion =
      leftVersion === undefined || leftVersion === VERSION_NEUTRAL;
    const rightMatchesAnyVersion =
      rightVersion === undefined || rightVersion === VERSION_NEUTRAL;

    if (leftMatchesAnyVersion || rightMatchesAnyVersion) return true;

    const leftValues = Array.isArray(leftVersion) ? leftVersion : [leftVersion];
    const rightValues = Array.isArray(rightVersion)
      ? rightVersion
      : [rightVersion];

    return leftValues.some(versionValue =>
      rightValues.includes(versionValue as never),
    );
  }

  private static hostsCanOverlap(
    leftHost: ResolvedRoute['host'],
    rightHost: ResolvedRoute['host'],
  ): boolean {
    if (leftHost === undefined || rightHost === undefined) return true;

    const leftHosts = Array.isArray(leftHost) ? leftHost : [leftHost];
    const rightHosts = Array.isArray(rightHost) ? rightHost : [rightHost];

    return leftHosts.some(leftValue =>
      rightHosts.some(rightValue =>
        RouteConflictDetector.hostValuesCanMatchSameRequest(
          leftValue,
          rightValue,
        ),
      ),
    );
  }

  private static hostValuesCanMatchSameRequest(
    leftValue: string | RegExp,
    rightValue: string | RegExp,
  ): boolean {
    const leftIsRegExp = leftValue instanceof RegExp;
    const rightIsRegExp = rightValue instanceof RegExp;
    if (leftIsRegExp && rightIsRegExp) return true;
    // Reset lastIndex before calling test() to guard against RegExps with the
    // `g` or `y` flags: those are stateful and would produce inconsistent
    // results (false negatives) when the same instance is reused across the
    // multiple pair comparisons that a single detect() run performs.
    if (leftIsRegExp) {
      leftValue.lastIndex = 0;
      return leftValue.test(rightValue as string);
    }
    if (rightIsRegExp) {
      rightValue.lastIndex = 0;
      return rightValue.test(leftValue as string);
    }
    return leftValue === rightValue;
  }

  private static routesAreIdentical(
    leftRoute: ResolvedRoute,
    rightRoute: ResolvedRoute,
    versioningOptions: VersioningOptions | undefined,
  ): boolean {
    return (
      leftRoute.method === rightRoute.method &&
      leftRoute.path === rightRoute.path &&
      RouteConflictDetector.hostsAreIdentical(
        leftRoute.host,
        rightRoute.host,
      ) &&
      RouteConflictDetector.versionsAreIdentical(
        leftRoute.version,
        rightRoute.version,
        versioningOptions,
      )
    );
  }

  private static hostsAreIdentical(
    leftHost: ResolvedRoute['host'],
    rightHost: ResolvedRoute['host'],
  ): boolean {
    if (leftHost === undefined && rightHost === undefined) return true;
    if (leftHost === undefined || rightHost === undefined) return false;

    const leftHosts = Array.isArray(leftHost) ? leftHost : [leftHost];
    const rightHosts = Array.isArray(rightHost) ? rightHost : [rightHost];

    // Set comparison, in both directions: ['a', 'b'] and ['b', 'a'] allow
    // the same hosts, and so do ['a', 'a'] and ['a'], while ['a', 'a'] and
    // ['a', 'b'] do not, although they have the same length.
    const isSubset = (
      hosts: Array<string | RegExp>,
      otherHosts: Array<string | RegExp>,
    ) =>
      hosts.every(value =>
        otherHosts.some(otherValue =>
          RouteConflictDetector.hostValuesAreIdentical(value, otherValue),
        ),
      );
    return isSubset(leftHosts, rightHosts) && isSubset(rightHosts, leftHosts);
  }

  private static hostValuesAreIdentical(
    leftValue: string | RegExp,
    rightValue: string | RegExp,
  ): boolean {
    if (leftValue instanceof RegExp && rightValue instanceof RegExp) {
      return (
        leftValue.source === rightValue.source &&
        leftValue.flags === rightValue.flags
      );
    }
    return leftValue === rightValue;
  }

  private static versionsAreIdentical(
    leftVersion: ResolvedRoute['version'],
    rightVersion: ResolvedRoute['version'],
    versioningOptions: VersioningOptions | undefined,
  ): boolean {
    // When versioning is not configured (or URI-based, where the
    // version is encoded in the path), version metadata does not
    // gate request matching at runtime, so two routes that differ
    // only in their declared `version` are runtime duplicates.
    if (!versioningOptions || versioningOptions.type === VersioningType.URI) {
      return true;
    }

    if (leftVersion === rightVersion) return true;

    const leftValues = Array.isArray(leftVersion) ? leftVersion : [leftVersion];
    const rightValues = Array.isArray(rightVersion)
      ? rightVersion
      : [rightVersion];
    if (leftValues.length !== rightValues.length) return false;

    return leftValues.every(value => rightValues.includes(value as never));
  }

  private static forEachUniquePair<TItem>(
    items: TItem[],
    visit: (leftItem: TItem, rightItem: TItem) => void,
  ): void {
    items.forEach((leftItem, leftIndex) => {
      items.slice(leftIndex + 1).forEach(rightItem => {
        visit(leftItem, rightItem);
      });
    });
  }

  private static describeConflict(conflict: RouteConflict): string {
    const method = RequestMethod[conflict.winner.method];
    const winnerLabel = `${conflict.winner.instanceWrapper.name}#${conflict.winner.methodName}`;
    const shadowedLabel = `${conflict.shadowed.instanceWrapper.name}#${conflict.shadowed.methodName}`;

    if (conflict.kind === 'duplicate') {
      return DUPLICATE_ROUTE_MESSAGE(
        method,
        conflict.winner.path,
        winnerLabel,
        shadowedLabel,
      );
    }
    return SHADOWED_ROUTE_MESSAGE(
      method,
      conflict.shadowed.path,
      shadowedLabel,
      conflict.winner.path,
      winnerLabel,
    );
  }
}
