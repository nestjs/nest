import { ResolvedRoute } from './interfaces/resolved-route.interface.js';
import {
  PathSegment,
  RouteConflictDetector,
} from './route-conflict-detector.js';

type SegmentKindOrMissing =
  'literal' | 'param' | 'wildcard' | 'end' | 'missing';

/**
 * Static utility class that orders resolved routes by specificity so the
 * underlying HTTP adapter registers more specific patterns first.
 * Stateless — every method takes everything it needs as parameters.
 */
export class RouteSpecificitySorter {
  /**
   * Lower rank means more specific. A literal segment beats a named
   * param, which beats a named wildcard. A position that is absent on
   * one side means the path is shorter at that point. A shorter path
   * with a wildcard is the least specific of all (`missing`), as the
   * wildcard can absorb the extra segments. Without one, it ranks after
   * a literal but before a param or wildcard (`end`): those can sit in
   * an optional group (`/users{/:id}`, `/{*path}`) and then also match
   * the shorter path.
   */
  private static readonly SEGMENT_KIND_RANK: Record<
    SegmentKindOrMissing,
    number
  > = {
    literal: 0,
    end: 1,
    param: 2,
    wildcard: 3,
    missing: 4,
  };

  /**
   * Returns a new array of routes sorted from most-specific to
   * least-specific. Routes that tie on specificity keep their original
   * declaration order.
   */
  public static sort(routes: ResolvedRoute[]): ResolvedRoute[] {
    const decoratedRoutes = routes.map((route, declarationIndex) => ({
      route,
      declarationIndex,
    }));

    decoratedRoutes.sort((leftEntry, rightEntry) => {
      const specificityDelta = RouteSpecificitySorter.comparePathSpecificity(
        leftEntry.route.path,
        rightEntry.route.path,
      );
      if (specificityDelta !== 0) return specificityDelta;
      return leftEntry.declarationIndex - rightEntry.declarationIndex;
    });

    return decoratedRoutes.map(decoratedEntry => decoratedEntry.route);
  }

  private static comparePathSpecificity(
    leftPath: string,
    rightPath: string,
  ): number {
    const leftSegments = RouteConflictDetector.tokenizePath(leftPath);
    const rightSegments = RouteConflictDetector.tokenizePath(rightPath);
    const longestPathLength = Math.max(
      leftSegments.length,
      rightSegments.length,
    );

    const leftEndKind = RouteSpecificitySorter.getEndKind(leftSegments);
    const rightEndKind = RouteSpecificitySorter.getEndKind(rightSegments);

    let specificityDelta = 0;

    Array.from({ length: longestPathLength }).forEach((_, segmentIndex) => {
      if (specificityDelta !== 0) return;

      const leftKind = leftSegments[segmentIndex]?.kind ?? leftEndKind;
      const rightKind = rightSegments[segmentIndex]?.kind ?? rightEndKind;

      const leftRank = RouteSpecificitySorter.rankSegmentByKind(leftKind);
      const rightRank = RouteSpecificitySorter.rankSegmentByKind(rightKind);

      if (leftRank !== rightRank) {
        specificityDelta = leftRank - rightRank;
      }
    });

    return specificityDelta;
  }

  private static getEndKind(segments: PathSegment[]): SegmentKindOrMissing {
    return segments.some(segment => segment.kind === 'wildcard')
      ? 'missing'
      : 'end';
  }

  private static rankSegmentByKind(kind: SegmentKindOrMissing): number {
    return RouteSpecificitySorter.SEGMENT_KIND_RANK[kind];
  }
}
