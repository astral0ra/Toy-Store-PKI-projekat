import { ToyModel } from './toy.model';

export type OrderStatus = 'rezervisano' | 'pristiglo' | 'otkazano';

export interface CartItem {
  toy: ToyModel;
  quantity: number;
  addedAt: string;
}

export interface OrderItem {
  id: number;
  toy: ToyModel;
  quantity: number;
  status: OrderStatus;
  orderedAt: string;
  statusChangedAt?: string;
}

export interface Order {
  id: number;
  items: OrderItem[];
  totalPrice: number;
  createdAt: string;
  userEmail: string;
}
