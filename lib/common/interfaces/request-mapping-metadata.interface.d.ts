import { RequestMethod } from '../enums/request-method.enum';
export interface RequestMappingMetadata {
    path?: string;
    method?: RequestMethod;
}
