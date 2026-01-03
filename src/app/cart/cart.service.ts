import { Injectable, signal, computed, inject } from '@angular/core';
import { ToyModel } from '../models/toy.model';
import { CartItem, Order, OrderItem } from '../models/order.model';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly CART_KEY = 'cart-items';
  private readonly ORDERS_KEY = 'user-orders';

  private cartItems = signal<CartItem[]>([]);
  private orders = signal<Order[]>([]);

  private authService = inject(AuthService);

  // Computed values
  totalPrice = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + (item.toy.price * item.quantity), 0);
  });

  itemCount = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  });

  constructor() {
    this.loadCart();
    this.loadOrders();
  }

  private loadCart(): void {
    try {
      const saved = localStorage.getItem(this.CART_KEY);
      if (saved) {
        this.cartItems.set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    }
  }

  private saveCart(): void {
    localStorage.setItem(this.CART_KEY, JSON.stringify(this.cartItems()));
  }

  private loadOrders(): void {
    try {
      const saved = localStorage.getItem(this.ORDERS_KEY);
      if (saved) {
        this.orders.set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load orders:', e);
    }
  }

  private saveOrders(): void {
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(this.orders()));
  }

  // Cart methods
  addItem(toy: ToyModel): void {
    const items = this.cartItems();
    const existingIndex = items.findIndex(item => item.toy.toyId === toy.toyId);

    if (existingIndex >= 0) {
      // Increase quantity if already in cart
      this.updateQuantity(existingIndex, items[existingIndex].quantity + 1);
    } else {
      // Add new item
      const newItem: CartItem = {
        toy,
        quantity: 1,
        addedAt: new Date().toISOString()
      };
      this.cartItems.update(items => [...items, newItem]);
      this.saveCart();
    }
  }

  getItems(): CartItem[] {
    return this.cartItems();
  }

  removeItem(index: number): void {
    this.cartItems.update(items => items.filter((_, i) => i !== index));
    this.saveCart();
  }

  updateQuantity(index: number, quantity: number): void {
    if (quantity < 1) {
      this.removeItem(index);
      return;
    }

    this.cartItems.update(items => {
      const updated = [...items];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
    this.saveCart();
  }

  clear(): void {
    this.cartItems.set([]);
    this.saveCart();
  }

  // Checkout - creates an order
  checkout(): Order | null {
    const user = this.authService.currentUser();
    if (!user) return null;

    const items = this.cartItems();
    if (items.length === 0) return null;

    const orderItems: OrderItem[] = items.map((item, index) => ({
      id: Date.now() + index,
      toy: item.toy,
      quantity: item.quantity,
      status: 'rezervisano' as const,
      orderedAt: new Date().toISOString()
    }));

    const order: Order = {
      id: Date.now(),
      items: orderItems,
      totalPrice: this.totalPrice(),
      createdAt: new Date().toISOString(),
      userEmail: user.email
    };

    this.orders.update(orders => [order, ...orders]);
    this.saveOrders();

    // Clear cart after checkout
    this.clear();

    return order;
  }

  // Order methods
  getOrders(): Order[] {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.orders().filter(o => o.userEmail === user.email);
  }

  getOrderById(orderId: number): Order | undefined {
    return this.orders().find(o => o.id === orderId);
  }

  updateItemStatus(orderId: number, itemId: number, status: 'rezervisano' | 'pristiglo' | 'otkazano'): void {
    this.orders.update(orders => {
      return orders.map(order => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          items: order.items.map(item => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              status,
              statusChangedAt: new Date().toISOString()
            };
          })
        };
      });
    });
    this.saveOrders();
  }

  cancelItem(orderId: number, itemId: number): void {
    this.updateItemStatus(orderId, itemId, 'otkazano');
  }

  markAsArrived(orderId: number, itemId: number): void {
    this.updateItemStatus(orderId, itemId, 'pristiglo');
  }

  deleteItem(orderId: number, itemId: number): void {
    this.orders.update(orders => {
      return orders.map(order => {
        if (order.id !== orderId) return order;
        const updatedItems = order.items.filter(item => item.id !== itemId);
        // Recalculate total price
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.toy.price * item.quantity), 0);
        return {
          ...order,
          items: updatedItems,
          totalPrice: newTotal
        };
      }).filter(order => order.items.length > 0); // Remove empty orders
    });
    this.saveOrders();
  }

  // Check if user has received a specific toy (for review restriction)
  hasUserReceivedToy(toyId: number): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    const userOrders = this.orders().filter(o => o.userEmail === user.email);
    for (const order of userOrders) {
      for (const item of order.items) {
        if (item.toy.toyId === toyId && item.status === 'pristiglo') {
          return true;
        }
      }
    }
    return false;
  }

  // Get order status for a specific toy (for review form messages)
  getToyOrderStatus(toyId: number): 'not-ordered' | 'rezervisano' | 'pristiglo' | 'otkazano' {
    const user = this.authService.currentUser();
    if (!user) return 'not-ordered';

    const userOrders = this.orders().filter(o => o.userEmail === user.email);
    let hasReserved = false;
    let hasCancelled = false;

    for (const order of userOrders) {
      for (const item of order.items) {
        if (item.toy.toyId === toyId) {
          if (item.status === 'pristiglo') return 'pristiglo';
          if (item.status === 'rezervisano') hasReserved = true;
          if (item.status === 'otkazano') hasCancelled = true;
        }
      }
    }

    if (hasReserved) return 'rezervisano';
    if (hasCancelled) return 'otkazano';
    return 'not-ordered';
  }
}
