import { RequestMethod } from "./../enums";

export interface RequestMappingProps {
    path: string,
    method?: RequestMethod
}
