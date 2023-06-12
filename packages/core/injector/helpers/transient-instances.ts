import { InjectionToken } from '@nestjs/common';
import { iterate } from 'iterare';
import { InstanceWrapper } from '../instance-wrapper';

/**
 * Returns the instances which are transient
 * @param instances The instances which should be checked whether they are transient
 */
export function getTransientInstances(
  instances: [InjectionToken, InstanceWrapper][],
): InstanceWrapper[] {
  return iterate(instances)
    .filter(([_, wrapper]) => wrapper.isDependencyTreeStatic())
    .map(([_, wrapper]) => wrapper.getStaticTransientInstances())
    .flatten()
    .filter(item => !!item)
    .map(({ instance }: any) => instance)
    .toArray() as InstanceWrapper[];
}

/**
 * Returns the instances which are not transient
 * @param instances The instances which should be checked whether they are transient
 */
export function getNonTransientInstances(
  instances: [InjectionToken, InstanceWrapper][],
): InstanceWrapper[] {
  return iterate(instances)
    .filter(
      ([key, wrapper]) =>
        wrapper.isDependencyTreeStatic() && !wrapper.isTransient,
    )
    .map(([key, { instance }]) => instance)
    .toArray() as InstanceWrapper[];
}
