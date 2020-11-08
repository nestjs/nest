export const isPromise = (promise): boolean =>
  promise instanceof Promise || 'then' in promise;
