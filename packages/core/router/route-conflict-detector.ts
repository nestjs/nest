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
   * Strips the leading `:` or `*` marker (if present) and tags each
   * segment as a literal, named param, or named wildcard.
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

    const lengthsDiffer = leftSegments.length !== rightSegments.length;
    const wildcardCanAbsorbDifference =
      leftEndsInWildcard || rightEndsInWildcard;

    if (lengthsDiffer && !wildcardCanAbsorbDifference) {
      return false;
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

        const samePath = earlierRoute.path === laterRoute.path;
        conflicts.push({
          winner: earlierRoute,
          shadowed: laterRoute,
          kind: samePath ? 'duplicate' : 'shadow',
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
    return String(leftHost) === String(rightHost);
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
