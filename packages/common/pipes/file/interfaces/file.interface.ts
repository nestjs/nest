export interface IFile {
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

export type FileTypeValidatorOptions = {
  fileType: string | RegExp;
};
