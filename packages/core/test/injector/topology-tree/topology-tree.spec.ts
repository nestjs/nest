import { TopologyTree } from '../../../injector/topology-tree/topology-tree.js';

// Minimal mock of Module to exercise the tree construction logic.
function createModuleMock(
  name: string,
  imports: any[] = [],
): Record<string, any> {
  return { name, imports, id: name };
}

describe('TopologyTree', () => {
  describe('basic construction', () => {
    it('should create a tree from a single module with no imports', () => {
      const root = createModuleMock('Root');
      const tree = new TopologyTree(root as any);

      const visited: Array<{ value: any; depth: number }> = [];
      tree.walk((value, depth) => visited.push({ value, depth }));

      expect(visited).toHaveLength(1);
      expect(visited[0].value).toBe(root);
      expect(visited[0].depth).toBe(1);
    });

    it('should create a tree with child modules', () => {
      const childA = createModuleMock('A');
      const childB = createModuleMock('B');
      const root = createModuleMock('Root', [childA, childB]);

      const tree = new TopologyTree(root as any);

      const visited: string[] = [];
      tree.walk((value: any) => visited.push(value.name));

      expect(visited).toContain('Root');
      expect(visited).toContain('A');
      expect(visited).toContain('B');
      expect(visited).toHaveLength(3);
    });
  });

  describe('walk', () => {
    it('should walk with correct depth values', () => {
      const grandchild = createModuleMock('Grandchild');
      const child = createModuleMock('Child', [grandchild]);
      const root = createModuleMock('Root', [child]);

      const tree = new TopologyTree(root as any);

      const depths: Record<string, number> = {};
      tree.walk((value: any, depth) => {
        depths[value.name] = depth;
      });

      expect(depths['Root']).toBe(1);
      expect(depths['Child']).toBe(2);
      expect(depths['Grandchild']).toBe(3);
    });
  });

  describe('cyclic imports', () => {
    it('should handle modules that import each other', () => {
      const a = createModuleMock('A');
      const b = createModuleMock('B');
      // Create a cycle: A imports B, B imports A
      a.imports = [b];
      b.imports = [a];
      const root = createModuleMock('Root', [a]);

      // Should not throw or infinite-loop
      const tree = new TopologyTree(root as any);

      const visited: string[] = [];
      tree.walk((value: any) => visited.push(value.name));

      expect(visited).toContain('Root');
      expect(visited).toContain('A');
      expect(visited).toContain('B');
    });
  });

  describe('null/undefined imports', () => {
    it('should skip null entries in imports', () => {
      const child = createModuleMock('Child');
      const root = createModuleMock('Root', [null, child, undefined]);

      const tree = new TopologyTree(root as any);

      const visited: string[] = [];
      tree.walk((value: any) => visited.push(value.name));

      expect(visited).toContain('Root');
      expect(visited).toContain('Child');
      expect(visited).toHaveLength(2);
    });
  });

  describe('shared imports (diamond dependency)', () => {
    it('should handle the same module imported by multiple parents', () => {
      const shared = createModuleMock('Shared');
      const childA = createModuleMock('A', [shared]);
      const childB = createModuleMock('B', [shared]);
      const root = createModuleMock('Root', [childA, childB]);

      const tree = new TopologyTree(root as any);

      const visited: string[] = [];
      tree.walk((value: any) => visited.push(value.name));

      // Shared should appear exactly once
      expect(visited.filter(n => n === 'Shared')).toHaveLength(1);
    });

    it('should place a shared module below the modules importing it', () => {
      const shared = createModuleMock('Shared');
      // childA is at depth 2, childB also at depth 2
      // shared first seen via childA (depth 2), then via childB (depth 2)
      const childA = createModuleMock('A', [shared]);
      const childB = createModuleMock('B', [shared]);
      const root = createModuleMock('Root', [childA, childB]);

      const tree = new TopologyTree(root as any);

      const depths: Record<string, number> = {};
      tree.walk((value: any, depth) => {
        depths[value.name] = depth;
      });

      // Shared should be at depth 3 (child of either A or B, both at depth 2)
      expect(depths['Shared']).toBe(3);
    });
  });

  describe('modules reached through import paths of different lengths', () => {
    function getDepths(root: Record<string, unknown>) {
      const depths: Record<string, number> = {};
      // any: the mocks only carry the fields the tree reads
      new TopologyTree(root as any).walk((value, depth) => {
        depths[value.name] = depth;
      });
      return depths;
    }

    it('should place a module below a sibling that imports it', () => {
      const db = createModuleMock('Db');
      const users = createModuleMock('Users', [db]);
      const root = createModuleMock('Root', [db, users]);

      expect(getDepths(root)).toEqual({ Root: 1, Users: 2, Db: 3 });
    });

    it('should place a module below the deepest module importing it', () => {
      const db = createModuleMock('Db');
      const users = createModuleMock('Users', [db]);
      const payments = createModuleMock('Payments', [users]);
      const orders = createModuleMock('Orders', [payments]);
      const root = createModuleMock('Root', [db, users, orders]);

      expect(getDepths(root)).toEqual({
        Root: 1,
        Orders: 2,
        Payments: 3,
        Users: 4,
        Db: 5,
      });
    });

    it('should move the imports of a module down when the module is found deeper', () => {
      // "Shared" is first placed below "B", deeper than "Late". "Late" is then
      // found deeper through "X" and "Y", which must move "Shared" as well.
      const shared = createModuleMock('Shared');
      const b = createModuleMock('B', [shared]);
      const a = createModuleMock('A', [b]);
      const late = createModuleMock('Late', [shared]);
      const y = createModuleMock('Y', [late]);
      const x = createModuleMock('X', [y]);
      const root = createModuleMock('Root', [a, late, x]);

      expect(getDepths(root)).toEqual({
        Root: 1,
        A: 2,
        X: 2,
        B: 3,
        Y: 3,
        Late: 4,
        Shared: 5,
      });
    });

    it('should ignore the import that closes a cycle', () => {
      const a = createModuleMock('A');
      const b = createModuleMock('B', [a]);
      a.imports = [b];
      const root = createModuleMock('Root', [a, b]);

      expect(getDepths(root)).toEqual({ Root: 1, A: 2, B: 3 });
    });
  });

  describe('modules with no imports property', () => {
    it('should handle modules without an imports property', () => {
      const leaf = { name: 'Leaf', id: 'Leaf' } as any; // no imports
      const root = createModuleMock('Root', [leaf]);

      const tree = new TopologyTree(root as any);

      const visited: string[] = [];
      tree.walk((value: any) => visited.push(value.name));

      expect(visited).toContain('Root');
      expect(visited).toContain('Leaf');
    });
  });
});
