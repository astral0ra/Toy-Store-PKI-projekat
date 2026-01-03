import { Component, signal, ViewEncapsulation, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,               // important for standalone + imports
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App {
  protected readonly title = signal('toy-store');
  auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/shop']);
  }

  goAccount() { this.router.navigate(['/account']); }
  goFavs()   { this.router.navigate(['/favorites']); }  
  goOrders() { this.router.navigate(['/orders']); }
}
