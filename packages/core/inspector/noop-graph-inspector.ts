import { GraphInspector } from './graph-inspector';

const noop = () => {};
export const NoopGraphInspector: GraphInspector = new Proxy(
  GraphInspector.prototype,
  {
    get: () => noop,
  },
);
