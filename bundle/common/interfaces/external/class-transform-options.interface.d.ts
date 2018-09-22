/**
 * Options to be passed during transformation.
 * @see https://github.com/typestack/class-transformer
 */
export interface ClassTransformOptions {
    /**
     * Exclusion strategy. By default exposeAll is used, which means that it will expose all properties are transformed
     * by default.
     */
    strategy?: 'excludeAll' | 'exposeAll';
    /**
     * Only properties with given groups gonna be transformed.
     */
    groups?: string[];
    /**
     * Only properties with "since" > version < "until" gonna be transformed.
     */
    version?: number;
    /**
     * Excludes properties with the given prefixes. For example, if you mark your private properties with "_" and "__"
     * you can set this option's value to ["_", "__"] and all private properties will be skipped.
     * This works only for "exposeAll" strategy.
     */
    excludePrefixes?: string[];
    /**
     * If set to true then class transformer will ignore all @Expose and @Exclude decorators and what inside them.
     * This option is useful if you want to kinda clone your object but do not apply decorators affects.
     */
    ignoreDecorators?: boolean;
    /**
     * Target maps allows to set a Types of the transforming object without using @Type decorator.
     * This is useful when you are transforming external classes, or if you already have type metadata for
     * objects and you don't want to set it up again.
     */
    targetMaps?: any[];
    /**
     * If set to true then class transformer will perform a circular check. (circular check is turned off by default)
     * This option is useful when you know for sure that your types might have a circular dependency.
     */
    enableCircularCheck?: boolean;
}
