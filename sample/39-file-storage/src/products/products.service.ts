import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product } from './product.js';

/** The store's catalog, in memory: a restart forgets the photo keys, not the files on the disks. */
@Injectable()
export class ProductsService {
  private readonly products = new Map<string, Product>([
    [
      'salmon-kibble-2kg',
      { id: 'salmon-kibble-2kg', name: 'Salmon kibble, 2 kg', price: 2499 },
    ],
    [
      'sisal-scratching-post',
      {
        id: 'sisal-scratching-post',
        name: 'Sisal scratching post',
        price: 3999,
      },
    ],
  ]);

  findOne(id: string): Product {
    const product = this.products.get(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  setPhoto(id: string, photoKey: string): void {
    this.findOne(id).photoKey = photoKey;
  }
}
