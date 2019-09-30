import { ContextId } from '../../injector';
import { ParamProperties } from '../context-utils';

export interface ExternalHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: (
    moduleKey: string,
    contextId?: ContextId,
    inquirerId?: string,
  ) => (ParamProperties & { metatype?: any })[];
}
