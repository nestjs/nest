import { randomBytes } from 'crypto';
import { createWriteStream, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import type {
  IncomingMultipartFile,
  MultipartStorageEngine,
  UploadedMultipartFile,
} from '../interfaces/index.js';

type NameCallback = (error: Error | null, value: string) => void;
type NameResolver = (
  req: any,
  file: IncomingMultipartFile,
  callback: NameCallback,
) => void;

/**
 * @publicApi
 */
export interface DiskStorageOptions {
  /**
   * The folder files are written to (Default: `os.tmpdir()`). A string is
   * created when the storage engine is; a function must return a folder that
   * already exists.
   */
  destination?: string | NameResolver;
  /** The file name within `destination` (Default: 32 random hex characters, no extension). */
  filename?: NameResolver;
}

function resolveName(
  resolver: NameResolver,
  req: any,
  file: IncomingMultipartFile,
) {
  return new Promise<string>((resolve, reject) =>
    resolver(req, file, (err, value) => (err ? reject(err) : resolve(value))),
  );
}

/**
 * Writes each file to disk, with multer's `diskStorage` defaults and file
 * shape (`destination`, `filename`, `path`, `size`).
 *
 * @publicApi
 */
export function diskStorage(
  options: DiskStorageOptions = {},
): MultipartStorageEngine {
  let resolveDestination: NameResolver;
  if (typeof options.destination === 'string') {
    const destination = options.destination;
    mkdirSync(destination, { recursive: true });
    resolveDestination = (_req, _file, callback) => callback(null, destination);
  } else {
    resolveDestination =
      options.destination ??
      ((_req, _file, callback) => callback(null, tmpdir()));
  }
  const resolveFilename: NameResolver =
    options.filename ??
    ((_req, _file, callback) =>
      callback(null, randomBytes(16).toString('hex')));

  const store = async (req: any, file: IncomingMultipartFile) => {
    const destination = await resolveName(resolveDestination, req, file);
    const filename = await resolveName(resolveFilename, req, file);
    const path = join(destination, filename);
    // As in multer, `path` is known to the file before it is written.
    (file as { path?: string }).path = path;
    const out = createWriteStream(path);
    try {
      await pipeline(file.stream, out);
    } catch (err) {
      await unlink(path).catch(() => undefined);
      throw err;
    }
    return { destination, filename, path, size: out.bytesWritten };
  };

  return {
    _handleFile(req, file, callback) {
      store(req, file).then(
        info => callback(null, info),
        err => callback(err),
      );
    },
    _removeFile(_req, file: UploadedMultipartFile, callback) {
      const path = file.path!;
      delete file.destination;
      delete file.filename;
      delete file.path;
      unlink(path).then(
        () => callback(null),
        err => callback(err),
      );
    },
  };
}
