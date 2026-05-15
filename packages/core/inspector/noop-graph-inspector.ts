import { GraphInspector } from './graph-inspector.js';

const noop = () => {};
export const NoopGraphInspector: GraphInspector = new Proxy(
  GraphInspector.prototype,
  {
    get: () => noop,
  },
);
