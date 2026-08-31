export function isDebugMode(): boolean {
  return !!process.env.NEST_DEBUG;
}
