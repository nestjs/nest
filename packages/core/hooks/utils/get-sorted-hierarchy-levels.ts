export function getSortedHierarchyLevels(
  groups: Map<number, unknown[]>,
  order: 'ASC' | 'DESC' = 'ASC',
): number[] {
  const comparator =
    order === 'ASC'
      ? (a: number, b: number) => a - b
      : (a: number, b: number) => b - a;
  const levels = Array.from(groups.keys()).sort(comparator);
  return levels;
}
