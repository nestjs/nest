export interface OrderItem {
  productId: string;
  quantity: number;
  /** Unit price in cents, copied from the catalog when the order is placed. */
  price: number;
}

export type OrderStatus = 'placed' | 'paid' | 'shipped' | 'cancelled';

export interface Order {
  id: string;
  partnerId: string;
  items: OrderItem[];
  /** In cents. */
  total: number;
  status: OrderStatus;
  paymentId: string | null;
  trackingNumber: string | null;
}

/** The data of the `order.shipped` webhook partners receive. */
export interface OrderShipped {
  orderId: string;
  trackingNumber: string;
}

/** The data of the `order.cancelled` webhook partners receive. */
export interface OrderCancelled {
  orderId: string;
  reason: string;
}
