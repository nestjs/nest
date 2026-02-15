import { ContextId } from '../../injector/index.js';
import { ParamProperties } from '../context-utils.js';

type ParamPropertiesWithMetatype<T = any> = ParamProperties & { metatype?: T };
export interface ExternalHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: (
    moduleKey: string,
    contextId?: ContextId,
    inquirerId?: string,
  ) => ParamPropertiesWithMetatype[];
}
