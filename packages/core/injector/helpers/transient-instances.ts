import { iterate } from 'iterare';
import { InstanceWrapper } from '../instance-wrapper';
import { InstanceToken } from '../module';

/**
 * Returns the instances which are transient
 * @param instances The instances which should be checked whether they are transcient
 */
export function getTransientInstances(
  instances: [InstanceToken, InstanceWrapper][],
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
 * @param instances The instances which should be checked whether they are transcient
 */
export function getNonTransientInstances(
  instances: [InstanceToken, InstanceWrapper][],
): InstanceWrapper[] {
  return iterate(instances)
    .filter(
      ([key, wrapper]) =>
        wrapper.isDependencyTreeStatic() && !wrapper.isTransient,
    )
    .map(([key, { instance }]) => instance)
    .toArray() as InstanceWrapper[];
}
