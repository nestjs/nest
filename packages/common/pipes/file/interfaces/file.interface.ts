export interface IFile {
  mimetype: string;
  size: number;
  buffer?: Buffer;
  originalname?: string;
}
