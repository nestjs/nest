export interface IFile {
  mimetype: string;
  size: number;
}

export interface IFileWithBuffer extends IFile {
  buffer: Buffer;
}

export type FileTypeValidatorOptions = {
  fileType: string | RegExp;
};
