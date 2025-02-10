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
    this.parent = parent;
    this.parent.addChild(this);
  }
}
