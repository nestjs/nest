/**
 * Interface describing method to set the target of the pipe decorator
 */
export interface TargetAwarePipe {
  isTargetAware: true;

  setTarget(target: unknown): void;
}

export function isTargetAware(pipe: unknown): pipe is TargetAwarePipe {
  return pipe['isTargetAware'];
}
