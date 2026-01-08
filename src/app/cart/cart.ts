import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
// MatSnackBar is the little popup notification at the bottom
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CartService } from '../services/cart.service';
import { CartItem } from '../models/order.model';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart {
  // Inject services
  private cartService = inject(CartService);   // manages cart state + checkout logic
  private authService = inject(AuthService);   // tells us if a user is logged in
  private router = inject(Router);             // navigation between pages
  private snackBar = inject(MatSnackBar);      // toast notifications

  items = this.cartService.getItems;
  totalPrice = this.cartService.totalPrice;
  itemCount = this.cartService.itemCount;

  //true while checkout is running
  checkingOut = signal(false);

  get cartItems(): CartItem[] {
    return this.cartService.getItems();
  }

  // Increase quantity for item at index i
  increaseQuantity(index: number): void {
    const item = this.cartItems[index];
    this.cartService.updateQuantity(index, item.quantity + 1);
  }
  // Decrease quantity for item at index i
  decreaseQuantity(index: number): void {
    const item = this.cartItems[index];
    this.cartService.updateQuantity(index, item.quantity - 1);
  }
  //Remove 1 item from the cart and show message
  removeItem(index: number): void {
    this.cartService.removeItem(index);
    this.snackBar.open('Igračka uklonjena iz korpe', 'OK', { duration: 2000 });
  }
  //Clear the whole cart
  clearCart(): void {
    this.cartService.clear();
    this.snackBar.open('Korpa je ispražnjena', 'OK', { duration: 2000 });
  }
  // Checkout button
  checkout(): void {
      // Must be logged in to place an order
    if (!this.authService.currentUser()) {
      this.snackBar.open('Morate biti prijavljeni da biste naručili', 'OK', { duration: 3000 });
      this.router.navigate(['/login']);
      return;
    }
    // Must have at least 1 item in the cart
    if (this.cartItems.length === 0) {
      this.snackBar.open('Korpa je prazna', 'OK', { duration: 2000 });
      return;
    }
    // Set loading state
    this.checkingOut.set(true);

    // Simulate a short delay for UX
    setTimeout(() => {
      // Create an order
      const order = this.cartService.checkout();
      // Stop loading state
      this.checkingOut.set(false);

      if (order) {
        this.snackBar.open('Porudžbina uspešno kreirana!', 'OK', { duration: 3000 });
        this.router.navigate(['/orders']);
      } else {
        this.snackBar.open('Greška pri kreiranju porudžbine', 'OK', { duration: 3000 });
      }
    }, 500);
  }

  goToShop(): void {
    this.router.navigate(['/shop']);
  }
}
