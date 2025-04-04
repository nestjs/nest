export interface IFile {
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

export type FileTypeValidatorOptions = {
  fileType: string | RegExp;

  /**
   * If `true`, the validator will skip the magic numbers validation.
   * This can be useful when you can't identify some files as there are no common magic numbers available for some file types.
   * @default false
   */
  skipMagicNumbersValidation?: boolean;
};
