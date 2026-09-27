export interface OrderItem {
  productId: string;
  quantity: number;
  /** Unit price in cents, copied from the catalog when the order is placed. */
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  /** In cents. */
  total: number;
  status: 'placed' | 'cancelled';
}

export class PlaceOrderDto {
  userId: string;
  items: { productId: string; quantity: number }[];
}
