import { HttpStatus, RequestMethod } from "../../enums";
import { applyDecorators } from "../core";
import { HttpCode } from "./http-code.decorator";
import { Delete, Get, Patch, Post, Put } from "./request-mapping.decorator";


const getStatus = (httpMethod: RequestMethod) => {
    if (httpMethod == RequestMethod.POST || httpMethod == RequestMethod.PUT) {
      return HttpStatus.CREATED;
    }
    return
 };

export const Api = (options: {
    status?: HttpStatus;
    method: RequestMethod;
    path?: string;
  }) => {
    const status: HttpStatus | undefined = options.status ? options.status : getStatus(options.method);
    
    return applyDecorators(
      ...[
        ...status? [HttpCode(status)]: [],
        ...(options.method == RequestMethod.PATCH ? [Patch(options?.path)] : []),
        ...(options.method == RequestMethod.POST ? [Post(options?.path)] : []),
        ...(options.method == RequestMethod.GET ? [Get(options?.path)] : []),
        ...(options.method == RequestMethod.DELETE
          ? [Delete(options?.path)]
          : []),
        ...(options.method == RequestMethod.PUT ? [Put(options?.path)] : []),
       
      ]
    );
  };