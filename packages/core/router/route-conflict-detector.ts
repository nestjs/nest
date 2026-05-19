import {
  Logger,
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningType,
  type RouteConflictPolicy,
  type VersioningOptions,
} from '@nestjs/common';
import { RouteConflictException } from '../errors/exceptions/route-conflict.exception.js';
import {
  DUPLICATE_ROUTE_MESSAGE,
  SHADOWED_ROUTE_MESSAGE,
} from '../errors/messages.js';
import { ResolvedRoute } from './interfaces/resolved-route.interface.js';
import { RouteConflict } from './interfaces/route-conflict.interface.js';

type SegmentKind = 'literal' | 'param' | 'wildcard';

interface PathSegment {
  kind: SegmentKind;
  value: string;
}

/**
 * Static utility class that detects overlapping HTTP routes and reports
 * them according to a per-kind policy. Stateless — every method takes
 * everything it needs as parameters.
 */
export class RouteConflictDetector {
  /**
   * Strips the leading `:` / `*` marker (if present) and tags each
   * segment as a literal, named param, or named wildcard. Supports both
   * bare named wildcards (`*path`) and adapter-normalized path-to-regexp
   * wildcard groups (`{*path}`).
   */
  public static tokenizePath(rawPath: string): PathSegment[] {
    const segments: PathSegment[] = [];

    rawPath
      .split('/')
      .filter(rawSegment => rawSegment.length > 0)
      .forEach(rawSegment => {
        if (rawSegment.startsWith('*')) {
          segments.push({ kind: 'wildcard', value: rawSegment.slice(1) });
          return;
        }
        if (rawSegment.startsWith('{*') && rawSegment.endsWith('}')) {
          segments.push({
            kind: 'wildcard',
            value: rawSegment.slice(2, -1),
          });
          return;
        }
        if (rawSegment.startsWith(':')) {
          segments.push({ kind: 'param', value: rawSegment.slice(1) });
          return;
        }
        segments.push({ kind: 'literal', value: rawSegment });
      });

    return segments;
  }

  /**
   * Decides whether two paths can match the same incoming request, given
   * only their declared patterns (no host/method/version considered).
   */
  public static pathsCanOverlap(leftPath: string, rightPath: string): boolean {
    const leftSegments = RouteConflictDetector.tokenizePath(leftPath);
    const rightSegments = RouteConflictDetector.tokenizePath(rightPath);

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
          !RouteConflictDetector.pathsCanOverlap(
            earlierRoute.path,
            laterRoute.path,
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

  private static segmentsCanOverlap(
    leftSegment: PathSegment,
    rightSegment: PathSegment,
  ): boolean {
    if (leftSegment.kind === 'wildcard' || rightSegment.kind === 'wildcard') {
      return true;
    }
    if (leftSegment.kind === 'param' || rightSegment.kind === 'param') {
      return true;
    }
    return leftSegment.value === rightSegment.value;
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
    if (leftIsRegExp) return leftValue.test(rightValue as string);
    if (rightIsRegExp) return rightValue.test(leftValue as string);
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
    if (leftHosts.length !== rightHosts.length) return false;

    // Order-insensitive set comparison: ['a', 'b'] and ['b', 'a']
    // describe the same allowed-host set, so they are identical for
    // duplicate-classification purposes.
    return leftHosts.every(leftValue =>
      rightHosts.some(rightValue =>
        RouteConflictDetector.hostValuesAreIdentical(leftValue, rightValue),
      ),
    );
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
