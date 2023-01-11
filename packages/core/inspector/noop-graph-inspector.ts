import { GraphInspector } from './graph-inspector';

export const NoopGraphInspector: GraphInspector = Object.create(
  GraphInspector.prototype,
);
