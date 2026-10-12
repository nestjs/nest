export interface OrderItem {
  productId: string;
  /** The product's name when the order was placed */
  name: string;
  /** Unit price in cents */
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  /** `pending` until the customer pays */
  status: 'pending' | 'paid';
  items: OrderItem[];
  /** Total in cents */
  total: number;
}
