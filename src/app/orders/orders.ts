import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CartService } from '../cart/cart.service';
import { Order, OrderItem, OrderStatus } from '../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class Orders {
  private cartService = inject(CartService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  get orders(): Order[] {
    return this.cartService.getOrders();
  }

  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'rezervisano': return 'Rezervisano';
      case 'pristiglo': return 'Pristiglo';
      case 'otkazano': return 'Otkazano';
      default: return status;
    }
  }

  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case 'rezervisano': return 'accent';
      case 'pristiglo': return 'primary';
      case 'otkazano': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: OrderStatus): string {
    switch (status) {
      case 'rezervisano': return 'schedule';
      case 'pristiglo': return 'check_circle';
      case 'otkazano': return 'cancel';
      default: return 'help';
    }
  }

  cancelItem(orderId: number, itemId: number): void {
    this.cartService.cancelItem(orderId, itemId);
    this.snackBar.open('Porudžbina otkazana', 'OK', { duration: 2000 });
  }

  // Admin simulation - mark as arrived
  markAsArrived(orderId: number, itemId: number): void {
    this.cartService.markAsArrived(orderId, itemId);
    this.snackBar.open('Igračka je pristigla! Sada možete ostaviti recenziju.', 'OK', { duration: 3000 });
  }

  deleteItem(orderId: number, itemId: number): void {
    this.cartService.deleteItem(orderId, itemId);
    this.snackBar.open('Stavka obrisana iz istorije', 'OK', { duration: 2000 });
  }

  goToReview(toyId: number): void {
    this.router.navigate(['/toy', toyId]);
  }

  goToShop(): void {
    this.router.navigate(['/shop']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
