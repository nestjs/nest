export function compareElementAt(
  prev: unknown[],
  curr: unknown[],
  index: number,
) {
  return prev && curr && prev[index] === curr[index];
}
