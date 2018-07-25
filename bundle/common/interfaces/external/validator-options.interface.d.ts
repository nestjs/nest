/**
 * Options passed to validator during validation.
 * @see https://github.com/typestack/class-validator
 */
export interface ValidatorOptions {
    /**
     * If set to true than validator will skip validation of all properties that are missing in the validating object.
     */
    skipMissingProperties?: boolean;
    /**
     * If set to true validator will strip validated object of any properties that do not have any decorators.
     *
     * Tip: if no other decorator is suitable for your property use @Allow decorator.
     */
    whitelist?: boolean;
    /**
     * If set to true, instead of stripping non-whitelisted properties validator will throw an error
     */
    forbidNonWhitelisted?: boolean;
    /**
     * Groups to be used during validation of the object.
     */
    groups?: string[];
    /**
     * If set to true, the validation will not use default messages.
     * Error message always will be undefined if its not explicitly set.
     */
    dismissDefaultMessages?: boolean;
    /**
     * ValidationError special options.
     */
    validationError?: {
        /**
         * Indicates if target should be exposed in ValidationError.
         */
        target?: boolean;
        /**
         * Indicates if validated value should be exposed in ValidationError.
         */
        value?: boolean;
    };
    /**
     * Setting true will cause fail validation of unknown objects.
     */
    forbidUnknownValues?: boolean;
}
