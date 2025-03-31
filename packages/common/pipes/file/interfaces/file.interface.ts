export interface IFile {
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

export interface IFileWithBuffer extends IFile {
  buffer: Buffer;
}

export type FileTypeValidatorOptions = {
  fileType: string | RegExp;
};
