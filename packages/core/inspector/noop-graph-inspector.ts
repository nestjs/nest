import { GraphInspector } from './graph-inspector';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
export const NoopGraphInspector: GraphInspector = new Proxy(
  GraphInspector.prototype,
  {
    get: () => noop,
  },
);
