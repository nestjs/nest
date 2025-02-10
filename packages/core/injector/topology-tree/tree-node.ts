export class TreeNode<T> {
  public readonly value: T;
  public readonly children = new Set<TreeNode<T>>();
  private parent: TreeNode<T> | null;

  constructor({ value, parent }: { value: T; parent: TreeNode<T> | null }) {
    this.value = value;
    this.parent = parent;
  }

  addChild(child: TreeNode<T>) {
    this.children.add(child);
  }

  removeChild(child: TreeNode<T>) {
    this.children.delete(child);
  }

  relink(parent: TreeNode<T>) {
    this.parent?.removeChild(this);

    this.parent = parent;
    this.parent.addChild(this);
  }

  getDepth() {
    const visited = new Set<TreeNode<T>>();

    let depth = 0;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: TreeNode<T> | null = this;

    while (current) {
      depth++;
      current = current.parent;

      // Stop on cycle
      if (visited.has(current!)) {
        return -1;
      }
      visited.add(current!);
    }
    return depth;
  }

  hasCycleWith(target: T) {
    const visited = new Set<TreeNode<T>>();

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: TreeNode<T> | null = this;

    while (current) {
      if (current.value === target) {
        return true;
      }
      current = current.parent;

      if (visited.has(current!)) {
        return false;
      }
      visited.add(current!);
    }
    return false;
  }
}
