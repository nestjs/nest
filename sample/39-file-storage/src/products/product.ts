export interface Product {
  id: string;
  name: string;
  /** Price in cents */
  price: number;
  /** Where the photo lives on the `photos` disk */
  photoKey?: string;
}
