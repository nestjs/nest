import { Request } from 'express';

export type CustomParamFactory = (data: any, req: Request & any) => any;
