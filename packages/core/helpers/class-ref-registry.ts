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
