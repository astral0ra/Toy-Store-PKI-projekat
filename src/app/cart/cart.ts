import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CartService } from './cart.service';
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
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  items = this.cartService.getItems;
  totalPrice = this.cartService.totalPrice;
  itemCount = this.cartService.itemCount;

  checkingOut = signal(false);

  get cartItems(): CartItem[] {
    return this.cartService.getItems();
  }

  increaseQuantity(index: number): void {
    const item = this.cartItems[index];
    this.cartService.updateQuantity(index, item.quantity + 1);
  }

  decreaseQuantity(index: number): void {
    const item = this.cartItems[index];
    this.cartService.updateQuantity(index, item.quantity - 1);
  }

  removeItem(index: number): void {
    this.cartService.removeItem(index);
    this.snackBar.open('Igračka uklonjena iz korpe', 'OK', { duration: 2000 });
  }

  clearCart(): void {
    this.cartService.clear();
    this.snackBar.open('Korpa je ispražnjena', 'OK', { duration: 2000 });
  }

  checkout(): void {
    if (!this.authService.currentUser()) {
      this.snackBar.open('Morate biti prijavljeni da biste naručili', 'OK', { duration: 3000 });
      this.router.navigate(['/login']);
      return;
    }

    if (this.cartItems.length === 0) {
      this.snackBar.open('Korpa je prazna', 'OK', { duration: 2000 });
      return;
    }

    this.checkingOut.set(true);

    // Simulate a short delay for UX
    setTimeout(() => {
      const order = this.cartService.checkout();
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
