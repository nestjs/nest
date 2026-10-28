import { Module } from '../module.js';

/**
 * Depth of every module the root module (depth 1) imports, directly or not:
 * the length of the longest import path that leads to it. A module is then
 * deeper than every module importing it, whichever path reached it first. An
 * import that closes a cycle (with `forwardRef()`) is left out, as no depth
 * could satisfy it.
 */
export class TopologyTree {
  private readonly depths = new Map<Module, number>();

  constructor(moduleRef: Module) {
    const order = this.sortTopologically(moduleRef);
    const positions = new Map(order.map((module, index) => [module, index]));

    // Every import comes after its importer in "order" (but those closing a
    // cycle), so the depth of a module is final before its imports are visited
    this.depths.set(moduleRef, 1);
    for (const module of order) {
      const position = positions.get(module)!;
      const childDepth = this.depths.get(module)! + 1;
      module.imports?.forEach(child => {
        if (!child || positions.get(child)! <= position) {
          return;
        }
        if ((this.depths.get(child) ?? 0) < childDepth) {
          this.depths.set(child, childDepth);
        }
      });
    }
  }

  public walk(callback: (value: Module, depth: number) => void) {
    this.depths.forEach((depth, module) => callback(module, depth));
  }

  /**
   * Reverse post-order of a depth-first traversal: every module comes before
   * its imports, except for an import back to a module still being traversed
   * (a cycle).
   */
  private sortTopologically(root: Module): Module[] {
    const visited = new Set<Module>();
    const order: Module[] = [];
    const visit = (module: Module) => {
      visited.add(module);
      module.imports?.forEach(child => {
        if (child && !visited.has(child)) {
          visit(child);
        }
      });
      order.push(module);
    };
    visit(root);
    return order.reverse();
  }
}
