import { InjectionToken } from '@nestjs/common';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';

export function getInstancesGroupedByHierarchyLevel(
  ...collections: Array<
    | Map<InjectionToken, InstanceWrapper>
    | Array<[InjectionToken, InstanceWrapper]>
  >
): Map<number, unknown[]> {
  const groupedByHierarchyLevel = new Map<number, unknown[]>();

  for (const collection of collections) {
    for (const [_, wrapper] of collection) {
      if (!wrapper.isDependencyTreeStatic()) {
        continue;
      }

      const level = wrapper.hierarchyLevel;
      if (!groupedByHierarchyLevel.has(level)) {
        groupedByHierarchyLevel.set(level, []);
      }

      const byHierarchyLevelGroup = groupedByHierarchyLevel.get(level);
      if (wrapper.isTransient) {
        const staticTransientInstances = wrapper
          .getStaticTransientInstances()
          .filter(i => !!i)
          .map(i => i.instance);
        byHierarchyLevelGroup!.push(...staticTransientInstances);
        continue;
      }

      if (wrapper.instance) {
        byHierarchyLevelGroup!.push(wrapper.instance);
      }
    }
  }

  return groupedByHierarchyLevel;
}
