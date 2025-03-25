import { Module } from '../module';
import { TreeNode } from './tree-node';

export class TopologyTree {
  private root: TreeNode<Module>;
  private links: Map<Module, TreeNode<Module>> = new Map();

  constructor(moduleRef: Module) {
    this.root = new TreeNode<Module>({
      value: moduleRef,
      parent: null,
    });
    this.links.set(moduleRef, this.root);
    this.traverseAndMapToTree(this.root);
  }

  public walk(callback: (value: Module, depth: number) => void) {
    function walkNode(node: TreeNode<Module>, depth = 1) {
      callback(node.value, depth);
      node.children.forEach(child => walkNode(child, depth + 1));
    }
    walkNode(this.root);
  }

  private traverseAndMapToTree(node: TreeNode<Module>, depth = 1) {
    if (!node.value.imports) {
      return;
    }
    node.value.imports.forEach(child => {
      if (!child) {
        return;
      }
      if (this.links.has(child)) {
        const existingSubtree = this.links.get(child)!;

        if (node.hasCycleWith(child)) {
          return;
        }
        const existingDepth = existingSubtree.getDepth();
        if (existingDepth < depth) {
          existingSubtree.relink(node);
        }
        return;
      }

      const childNode = new TreeNode<Module>({
        value: child,
        parent: node,
      });
      node.addChild(childNode);

      this.links.set(child, childNode);

      this.traverseAndMapToTree(childNode, depth + 1);
    });
  }
}
