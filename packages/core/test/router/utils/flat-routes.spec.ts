import { Module } from '@nestjs/common';
import { expect } from 'chai';
import { flattenRoutePaths } from '../../../router/utils';

describe('flattenRoutePaths', () => {
  it('should flatten all route paths', () => {
    @Module({})
    class ParentModule {}
    @Module({})
    class ChildModule {}
    @Module({})
    class ChildChildModule {}
    @Module({})
    class ChildModule2 {}
    @Module({})
    class ChildModule3 {}
    @Module({})
    class ChildModule4 {}
    @Module({})
    class ParentChildModule {}
    @Module({})
    class ChildChildModule2 {}
    @Module({})
    class AuthModule {}
    @Module({})
    class CatsModule {}
    @Module({})
    class DogsModule {}

    @Module({})
    class AuthModule2 {}
    @Module({})
    class CatsModule2 {}
    @Module({})
    class CatsModule3 {}
    @Module({})
    class AuthModule3 {}
    const routes = [
      {
        path: '/parent',
        module: ParentModule,
        pathBeforeVersion: true,
        children: [
          {
            path: '/child',
            module: ChildModule,
            children: [
              { path: '/child2', module: ChildModule2 },
              {
                path: '/parentchild',
                module: ParentChildModule,
                children: [
                  {
                    path: '/childchild',
                    module: ChildChildModule,
                    children: [
                      { path: '/child2child', module: ChildChildModule2 },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: '/child2',
            children: [
              {
                path: 'child',
                module: ChildModule3,
              },
              ChildModule4,
            ],
          },
        ],
      },
      { path: '/v1', children: [AuthModule, CatsModule, DogsModule] },
      { path: '/v2', children: [AuthModule2, CatsModule2] },
      { path: '/v3', children: [AuthModule3, CatsModule3] },
    ];
    const expectedRoutes = [
      { path: '/parent', pathBeforeVersion: true, module: ParentModule },
      {
        path: '/parent/child',
        pathBeforeVersion: true,
        module: ChildModule,
      },
      {
        path: '/parent/child/child2',
        pathBeforeVersion: true,
        module: ChildModule2,
      },
      {
        path: '/parent/child/parentchild',
        pathBeforeVersion: true,
        module: ParentChildModule,
      },
      {
        path: '/parent/child/parentchild/childchild',
        pathBeforeVersion: true,
        module: ChildChildModule,
      },
      {
        path: '/parent/child/parentchild/childchild/child2child',
        pathBeforeVersion: true,
        module: ChildChildModule2,
      },
      {
        path: '/parent/child2',
        pathBeforeVersion: true,
        module: ChildModule4,
      },
      {
        path: '/parent/child2/child',
        pathBeforeVersion: true,
        module: ChildModule3,
      },
      { path: '/v1', pathBeforeVersion: undefined, module: AuthModule },
      { path: '/v1', pathBeforeVersion: undefined, module: CatsModule },
      { path: '/v1', pathBeforeVersion: undefined, module: DogsModule },
      { path: '/v2', pathBeforeVersion: undefined, module: AuthModule2 },
      { path: '/v2', pathBeforeVersion: undefined, module: CatsModule2 },
      { path: '/v3', pathBeforeVersion: undefined, module: AuthModule3 },
      { path: '/v3', pathBeforeVersion: undefined, module: CatsModule3 },
    ];
    expect(flattenRoutePaths(routes)).to.be.eql(expectedRoutes);
  });
});
