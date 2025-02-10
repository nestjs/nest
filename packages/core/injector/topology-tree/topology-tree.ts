import { Module } from '../module';
import { TreeNode } from './tree-node';

export class TopologyTree {
  private root: TreeNode<Module>;
  private links: Map<
    Module,
    {
      node: TreeNode<Module>;
      depth: number;
    }
  > = new Map();

  static from(root: Module) {
    const tree = new TopologyTree();
    tree.root = new TreeNode<Module>({
      value: root,
      parent: null,
    });

    tree.traverseAndCloneTree(tree.root);
    return tree;
  }

  public walk(callback: (value: Module, depth: number) => void) {
    function walkNode(node: TreeNode<Module>, depth = 1) {
      callback(node.value, depth);
      node.children.forEach(child => walkNode(child, depth + 1));
    }
    walkNode(this.root);
  }

  private traverseAndCloneTree(node: TreeNode<Module>, depth = 1) {
    node.value.imports.forEach(child => {
      if (!child) {
        return;
      }
      if (this.links.has(child)) {
        const existingSubtree = this.links.get(child)!;
        if (existingSubtree.depth < depth) {
          existingSubtree.node.relink(node);
          existingSubtree.depth = depth;
        }
        return;
      }

      const childNode = new TreeNode<Module>({
        value: child,
        parent: node,
      });
      node.addChild(childNode);
      this.links.set(child, {
        node: childNode,
        depth,
      });

      this.traverseAndCloneTree(childNode, depth + 1);
    });
  }
}
