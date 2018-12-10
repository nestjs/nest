/**
 * Validation error description.
 * @see https://github.com/typestack/class-validator
 */
export interface ValidationError {
  /**
   * Object that was validated.
   */
  target: Object;
  /**
   * Object's property that haven't pass validation.
   */
  property: string;
  /**
   * Value that haven't pass a validation.
   */
  value: any;
  /**
   * Constraints that failed validation with error messages.
   */
  constraints: {
    [type: string]: string;
  };
  /**
   * Contains all nested validation errors of the property.
   */
  children: ValidationError[];
}
