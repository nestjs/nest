import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { H3FormField } from '../interfaces/multer-options.interface';

/**
 * Request body decorator that extracts all form fields from multipart requests.
 * Used with file upload interceptors to access non-file form data.
 *
 * @example
 * ```typescript
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * uploadFile(
 *   @UploadedFile() file: H3UploadedFile,
 *   @UploadedFields() fields: H3FormField[]
 * ) {
 *   // fields contains all non-file form fields
 * }
 * ```
 *
 * @publicApi
 */
export const UploadedFields = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): H3FormField[] => {
    const request = ctx.switchToHttp().getRequest();
    return request.formFields || [];
  },
);

/**
 * Request body decorator that extracts form fields as a key-value object.
 * If multiple fields have the same name, they are collected into an array.
 *
 * @example
 * ```typescript
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * uploadFile(
 *   @UploadedFile() file: H3UploadedFile,
 *   @FormBody() body: Record<string, string | string[]>
 * ) {
 *   // body contains form fields as { fieldname: value }
 *   const username = body.username; // string
 *   const tags = body.tags; // string[] if multiple values
 * }
 * ```
 *
 * @publicApi
 */
export const FormBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Record<string, string | string[]> => {
    const request = ctx.switchToHttp().getRequest();
    const fields: H3FormField[] = request.formFields || [];

    const result: Record<string, string | string[]> = {};
    for (const field of fields) {
      const existing = result[field.fieldname];
      if (existing === undefined) {
        result[field.fieldname] = field.value;
      } else if (Array.isArray(existing)) {
        existing.push(field.value);
      } else {
        result[field.fieldname] = [existing, field.value];
      }
    }

    return result;
  },
);

/**
 * Request body decorator that extracts a single form field by name.
 * Returns the field value or undefined if not found.
 *
 * @param fieldName The name of the form field to extract
 *
 * @example
 * ```typescript
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * uploadFile(
 *   @UploadedFile() file: H3UploadedFile,
 *   @FormField('username') username: string,
 *   @FormField('email') email: string
 * ) {
 *   // Access individual form fields directly
 * }
 * ```
 *
 * @publicApi
 */
export const FormField = createParamDecorator(
  (fieldName: string, ctx: ExecutionContext): string | string[] | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const fields: H3FormField[] = request.formFields || [];

    const matchingFields = fields.filter(f => f.fieldname === fieldName);

    if (matchingFields.length === 0) {
      return undefined;
    }

    if (matchingFields.length === 1) {
      return matchingFields[0].value;
    }

    // Multiple values with same name
    return matchingFields.map(f => f.value);
  },
);
