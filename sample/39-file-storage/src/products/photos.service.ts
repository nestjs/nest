import { randomUUID } from 'node:crypto';
import { buffer } from 'node:stream/consumers';
import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  detectContentType,
  InjectDisk,
  StorageDisk,
  StorageFileNotFoundError,
} from '@nestjs/storage';
import {
  MAX_PHOTO_SIZE,
  PHOTO_CACHE_CONTROL,
  PHOTO_TYPES,
} from './photo-rules.js';
import { ProductsService } from './products.service.js';

/** The extension a photo's key gets, the one `uploadToDisk()` gives each type. */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class PhotosService {
  constructor(
    private readonly productsService: ProductsService,
    @InjectDisk('photos') private readonly photos: StorageDisk,
    @InjectDisk('private') private readonly uploads: StorageDisk,
  ) {}

  async replace(
    productId: string,
    key: string,
  ): Promise<{ id: string; photoUrl: string }> {
    let previous: string | undefined;
    try {
      previous = this.productsService.findOne(productId).photoKey;
      this.productsService.setPhoto(productId, key);
    } catch (error) {
      // The upload is already stored: don't leave it behind for a product that doesn't exist
      await this.photos.delete(key);
      throw error;
    }
    if (previous) {
      await this.photos.delete(previous);
    }
    return { id: productId, photoUrl: this.photos.url(key) };
  }

  async createUpload(productId: string, contentType: string, size: number) {
    this.productsService.findOne(productId);
    if (!PHOTO_TYPES.includes(contentType)) {
      throw new UnsupportedMediaTypeException(
        `A photo must be one of: ${PHOTO_TYPES.join(', ')}`,
      );
    }
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_PHOTO_SIZE) {
      throw new BadRequestException(
        `size must be between 1 and ${MAX_PHOTO_SIZE} bytes`,
      );
    }
    // Private until checked; the product id in the key ties the upload to this product
    const key = `incoming/${productId}/${randomUUID()}`;
    const upload = await this.uploads.signedUpload(key, {
      contentType,
      contentLength: size,
      expiresIn: '10m',
    });
    return { key, ...upload };
  }

  async completeUpload(productId: string, key: string) {
    this.productsService.findOne(productId);
    // Only keys this endpoint handed out for this product: never copy an arbitrary private
    // file (an invoice) to the public photos disk.
    const prefix = `incoming/${productId}/`;
    if (
      typeof key !== 'string' ||
      !key.startsWith(prefix) ||
      !/^[0-9a-f-]{36}$/.test(key.slice(prefix.length))
    ) {
      throw new BadRequestException('Unknown upload');
    }
    const file = await this.uploads.stat(key).catch((error: unknown) => {
      if (error instanceof StorageFileNotFoundError) {
        throw new BadRequestException('Upload the file first');
      }
      throw error;
    });
    if (file.size > MAX_PHOTO_SIZE) {
      await this.uploads.delete(key);
      throw new PayloadTooLargeException('File too large');
    }
    // The client chose the Content-Type: check what the bytes are
    const head = await this.uploads.get(key, { range: { start: 0, end: 15 } });
    const type = detectContentType(await buffer(head.body));
    if (!type || !PHOTO_TYPES.includes(type)) {
      await this.uploads.delete(key);
      throw new UnsupportedMediaTypeException(
        `A photo must be one of: ${PHOTO_TYPES.join(', ')}`,
      );
    }
    // Stream it from the private disk to the public one
    const photoKey = `${randomUUID()}${EXTENSIONS[type]}`;
    const { body } = await this.uploads.get(key);
    await this.photos.put(photoKey, body, {
      contentType: type,
      contentLength: file.size,
      cacheControl: PHOTO_CACHE_CONTROL,
    });
    await this.uploads.delete(key);
    return this.replace(productId, photoKey);
  }
}
