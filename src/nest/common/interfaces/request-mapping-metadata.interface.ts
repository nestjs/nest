import { RequestMethod } from "../enums/request-method.enum";

export interface RequestMappingProps {
    path: string,
    method?: RequestMethod
}
