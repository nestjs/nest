import { ParseFileOptions } from './parse-file-options.interface';

export interface ParseFileFieldsOptions {
  commonOptions?: ParseFileOptions;
  fields: Array<{ name: string; options?: ParseFileOptions }>;
}
