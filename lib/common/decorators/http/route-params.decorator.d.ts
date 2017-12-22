import 'reflect-metadata';
import { PipeTransform } from '../../index';
export declare type ParamData = object | string | number;
export interface RouteParamsMetadata {
    [prop: number]: {
        index: number;
        data?: ParamData;
    };
}
export declare const Request: () => ParameterDecorator;
export declare const Response: () => ParameterDecorator;
export declare const Next: () => ParameterDecorator;
export declare const Session: () => ParameterDecorator;
export declare const Headers: (property?: string) => ParameterDecorator;
export declare function Query(): any;
export declare function Query(...pipes: PipeTransform<any>[]): any;
export declare function Query(property: string, ...pipes: PipeTransform<any>[]): any;
export declare function Body(): any;
export declare function Body(...pipes: PipeTransform<any>[]): any;
export declare function Body(property: string, ...pipes: PipeTransform<any>[]): any;
export declare function Param(): any;
export declare function Param(...pipes: PipeTransform<any>[]): any;
export declare function Param(property: string, ...pipes: PipeTransform<any>[]): any;
export declare const Req: () => ParameterDecorator;
export declare const Res: () => ParameterDecorator;
