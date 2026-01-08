import { Injectable, signal, computed, inject } from '@angular/core';
import { ToyModel } from '../models/toy.model';
import { CartItem, Order, OrderItem } from '../models/order.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  // Local storage keys
  private readonly CART_KEY = 'cart-items';
  private readonly ORDERS_KEY = 'user-orders';

  // cartItems() gives the current cart array
  // orders() gives the current orders array
  private cartItems = signal<CartItem[]>([]);
  private orders = signal<Order[]>([]);
  // Used to know which user is logged in (checkout and filtering orders)
  private authService = inject(AuthService);

  // Automatically recalculates whenever cartItems change
  totalPrice = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + (item.toy.price * item.quantity), 0);
  });
  // Total item count
  itemCount = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  });
  // When service is created (app start) restore stored data
  constructor() {
    this.loadCart();
    this.loadOrders();
  }
  // Load cart from localStorage into cartItems signal
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
  // Save cartItems signal into localStorage
  private saveCart(): void {
    localStorage.setItem(this.CART_KEY, JSON.stringify(this.cartItems()));
  }
  // Load orders from localStorage into orders signal
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
  // Add a toy to cart:
  // if already exists, increase quantity
  // else add new CartItem with quantity 1 and timestamp

  addItem(toy: ToyModel): void {
    const items = this.cartItems();
    const existingIndex = items.findIndex(item => item.toy.toyId === toy.toyId);

    // Find existing toy by toyId
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
      // Create a new array
      this.cartItems.update(items => [...items, newItem]);
      // Save to local storage  
      this.saveCart();
    }
  }
  //Read only access to current cart items
  getItems(): CartItem[] {
    return this.cartItems();
  }
  //Remove item by array index
  removeItem(index: number): void {
    this.cartItems.update(items => items.filter((_, i) => i !== index));
    this.saveCart();
  }

  // Update quantity by index
  // If quantity < 1, item is removed
  updateQuantity(index: number, quantity: number): void {
    if (quantity < 1) {
      this.removeItem(index);
      return;
    }

    this.cartItems.update(items => {
      const updated = [...items]; // copy array
      updated[index] = { ...updated[index], quantity }; //copy item and change the quantity
      return updated;
    });
    this.saveCart();
  }
  // Clear entire cart
  clear(): void {
    this.cartItems.set([]);
    this.saveCart();
  }

  // Checkout - creates an order from current cart and clean cart
  checkout(): Order | null {
    const user = this.authService.currentUser();
    if (!user) return null;

    const items = this.cartItems();
    if (items.length === 0) return null;

    // Convert cartItem into orderItem
    const orderItems: OrderItem[] = items.map((item, index) => ({
      id: Date.now() + index,
      toy: item.toy,
      quantity: item.quantity,
      status: 'rezervisano' as const,
      orderedAt: new Date().toISOString()
    }));

    // Create order object
    const order: Order = {
      id: Date.now(),
      items: orderItems,
      totalPrice: this.totalPrice(),
      createdAt: new Date().toISOString(),
      userEmail: user.email
    };
    // Save newest order at the beginning
    this.orders.update(orders => [order, ...orders]);
    this.saveOrders();

    // Clear cart after checkout
    this.clear();

    return order;
  }

  // Order methods
  // Return onlz orders belonging to the currently logged in user
  getOrders(): Order[] {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.orders().filter(o => o.userEmail === user.email);
  }
  // Get a single order by id (no user filter)
  getOrderById(orderId: number): Order | undefined {
    return this.orders().find(o => o.id === orderId);
  }
  // Update status of one item inside one order
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
  // Delete one item from an order and recalculate totals
  // If an order becomes empty, remove it entirely
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

  // Used to restrict reviews to only delivered items
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

  // Returns the overall status for a toy for the logged-in user:
  // - pristiglo wins immediately
  // - otherwise rezervisano if at least one reserved
  // - otherwise otkazano if at least one cancelled
  // - otherwise not-ordered
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
