/**
 * Maps the prototype of each class Nest instantiates to that class.
 * The `constructor` property of a prototype cannot be relied on for this:
 * mixin helpers overwrite it, and class decorators returning a `Proxy` leave
 * it pointing at the wrapped class.
 */
const classRefsByPrototype = new WeakMap<object, Function>();

export function registerClassRef(classRef: Function) {
  if (classRef.prototype) {
    classRefsByPrototype.set(classRef.prototype, classRef);
  }
}

/**
 * Returns the class the given instance was created from. Falls back to the
 * `constructor` property for objects whose class was not registered.
 */
export function getClassRef(instance: object): Function {
  return (
    classRefsByPrototype.get(Object.getPrototypeOf(instance)) ??
    instance.constructor
  );
}

/**
 * Returns the class on which the parameter decorators of the given method
 * stored their metadata: the `constructor` of the prototype that declared the
 * method. That is `classRef.prototype.constructor` as long as the method is
 * the one that class has, which holds for an ordinary class, for a class that
 * a class decorator wrapped in a `Proxy`, and for a method that a mixin helper
 * copied together with `constructor`. A method that the class declares next
 * to such a mixin has its metadata on the class itself.
 */
export function getParamsHost(
  classRef: Function,
  methodName: string | symbol,
): Function {
  const prototype = classRef?.prototype;
  const ctor = prototype?.constructor;
  if (
    typeof ctor === 'function' &&
    ctor.prototype?.[methodName] === prototype[methodName]
  ) {
    return ctor;
  }
  return classRef;
}
