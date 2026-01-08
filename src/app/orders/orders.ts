import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CartService } from '../services/cart.service';
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
  // Inject cart service that also handles orders
  private cartService = inject(CartService);

  // Inject router to navigate to other pages
  private router = inject(Router);

  // Inject snackbar to show short user notifications 
  private snackBar = inject(MatSnackBar);

  // Getter returns current user's orders (filtered inside the service)
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

  // Map status to Material theme color for chips/buttons
  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case 'rezervisano': return 'accent';
      case 'pristiglo': return 'primary';
      case 'otkazano': return 'warn';
      default: return '';
    }
  }

// Map status to Material icon name to display visually
  getStatusIcon(status: OrderStatus): string {
    switch (status) {
      case 'rezervisano': return 'schedule';
      case 'pristiglo': return 'check_circle';
      case 'otkazano': return 'cancel';
      default: return 'help';
    }
  }
// Cancel a single ordered item and notify user
  cancelItem(orderId: number, itemId: number): void {
    this.cartService.cancelItem(orderId, itemId);
    this.snackBar.open('Porudžbina otkazana', 'OK', { duration: 2000 });
  }

  // Admin simulation - mark as arrived so review can be possible
  markAsArrived(orderId: number, itemId: number): void {
    this.cartService.markAsArrived(orderId, itemId);
    this.snackBar.open('Igračka je pristigla! Sada možete ostaviti recenziju.', 'OK', { duration: 3000 });
  }
  // Remove an item from order history and notify user
  deleteItem(orderId: number, itemId: number): void {
    this.cartService.deleteItem(orderId, itemId);
    this.snackBar.open('Stavka obrisana iz istorije', 'OK', { duration: 2000 });
  }
  // Open toy page (where review happens)
  goToReview(toyId: number): void {
    this.router.navigate(['/toy', toyId]);
  }
  // Navigation helper to go back to shop page
  goToShop(): void {
    this.router.navigate(['/shop']);
  }
  // Format date into dd/mm/yyyy/hh/mm
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
