import { expect } from 'chai';
import { TreeNode } from '../../../injector/topology-tree/tree-node';

describe('TreeNode', () => {
  describe('constructor', () => {
    it('should create a node with the given value', () => {
      const node = new TreeNode({ value: 'test', parent: null });
      expect(node.value).to.equal('test');
    });

    it('should create a node with null parent', () => {
      const node = new TreeNode({ value: 'test', parent: null });
      expect(node.children.size).to.equal(0);
    });

    it('should create a node with a parent', () => {
      const parent = new TreeNode({ value: 'parent', parent: null });
      const child = new TreeNode({ value: 'child', parent });
      expect(child.value).to.equal('child');
    });
  });

  describe('addChild', () => {
    it('should add a child to the node', () => {
      const parent = new TreeNode({ value: 'parent', parent: null });
      const child = new TreeNode({ value: 'child', parent: null });

      parent.addChild(child);

      expect(parent.children.has(child)).to.be.true;
      expect(parent.children.size).to.equal(1);
    });

    it('should add multiple children', () => {
      const parent = new TreeNode({ value: 'parent', parent: null });
      const child1 = new TreeNode({ value: 'child1', parent: null });
      const child2 = new TreeNode({ value: 'child2', parent: null });

      parent.addChild(child1);
      parent.addChild(child2);

      expect(parent.children.size).to.equal(2);
    });
  });

  describe('removeChild', () => {
    it('should remove a child from the node', () => {
      const parent = new TreeNode({ value: 'parent', parent: null });
      const child = new TreeNode({ value: 'child', parent: null });

      parent.addChild(child);
      parent.removeChild(child);

      expect(parent.children.has(child)).to.be.false;
      expect(parent.children.size).to.equal(0);
    });

    it('should do nothing when removing a non-existent child', () => {
      const parent = new TreeNode({ value: 'parent', parent: null });
      const child = new TreeNode({ value: 'child', parent: null });

      parent.removeChild(child);

      expect(parent.children.size).to.equal(0);
    });
  });

  describe('relink', () => {
    it('should change the parent of a node', () => {
      const oldParent = new TreeNode({ value: 'oldParent', parent: null });
      const newParent = new TreeNode({ value: 'newParent', parent: null });
      const child = new TreeNode({ value: 'child', parent: oldParent });

      oldParent.addChild(child);
      child.relink(newParent);

      expect(oldParent.children.has(child)).to.be.false;
      expect(newParent.children.has(child)).to.be.true;
    });

    it('should work when node has no previous parent', () => {
      const newParent = new TreeNode({ value: 'newParent', parent: null });
      const child = new TreeNode({ value: 'child', parent: null });

      child.relink(newParent);

      expect(newParent.children.has(child)).to.be.true;
    });
  });

  describe('getDepth', () => {
    it('should return 1 for a root node', () => {
      const root = new TreeNode({ value: 'root', parent: null });
      expect(root.getDepth()).to.equal(1);
    });

    it('should return 2 for a child of root', () => {
      const root = new TreeNode({ value: 'root', parent: null });
      const child = new TreeNode({ value: 'child', parent: root });
      expect(child.getDepth()).to.equal(2);
    });

    it('should return correct depth for deeply nested nodes', () => {
      const root = new TreeNode({ value: 'root', parent: null });
      const level1 = new TreeNode({ value: 'level1', parent: root });
      const level2 = new TreeNode({ value: 'level2', parent: level1 });
      const level3 = new TreeNode({ value: 'level3', parent: level2 });

      expect(level3.getDepth()).to.equal(4);
    });

    it('should return -1 when a cycle is detected', () => {
      const nodeA = new TreeNode({ value: 'a', parent: null });
      const nodeB = new TreeNode({ value: 'b', parent: nodeA });
      const nodeC = new TreeNode({ value: 'c', parent: nodeB });

      // Create cycle: A -> B -> C -> A
      nodeA.relink(nodeC);

      expect(nodeA.getDepth()).to.equal(-1);
    });
  });

  describe('hasCycleWith', () => {
    it('should return false when there is no cycle', () => {
      const root = new TreeNode({ value: 'root', parent: null });
      const child = new TreeNode({ value: 'child', parent: root });

      expect(child.hasCycleWith('nonexistent')).to.be.false;
    });

    it('should return true when the target value exists in the parent chain', () => {
      const root = new TreeNode({ value: 'root', parent: null });
      const child = new TreeNode({ value: 'child', parent: root });

      expect(child.hasCycleWith('root')).to.be.true;
    });

    it('should return true when checking against own value', () => {
      const node = new TreeNode({ value: 'self', parent: null });
      expect(node.hasCycleWith('self')).to.be.true;
    });

    it('should return false for root node with non-matching value', () => {
      const root = new TreeNode({ value: 'root', parent: null });
      expect(root.hasCycleWith('other')).to.be.false;
    });

    it('should return false when cycle exists but target not in chain', () => {
      const nodeA = new TreeNode({ value: 'a', parent: null });
      const nodeB = new TreeNode({ value: 'b', parent: nodeA });
      const nodeC = new TreeNode({ value: 'c', parent: nodeB });

      // Create cycle: A -> B -> C -> A
      nodeA.relink(nodeC);

      expect(nodeA.hasCycleWith('nonexistent')).to.be.false;
    });
  });
});
