import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { CartService } from '../services/cart.service';
import { ToyModel } from '../models/toy.model';
import { FavoriteToysService } from '../services/favorite-toys.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-favorite-toys',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './favorite-toys.html',
  styleUrls: ['./favorite-toys.css'],
})
export class FavoriteToys implements OnInit {
  favorites: ToyModel[] = [];

  searchControl = new FormControl<string>('');
  sortControl = new FormControl<string>('name');
  sortDirectionControl = new FormControl<'rast' | 'opad'>('rast');

  constructor(
    private favoriteService: FavoriteToysService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.favorites = this.favoriteService.getFavorites();
  }

  /** Apply search + sort before rendering */
  favoriteToys(): ToyModel[] {
    let toys = this.favoriteService.getFavorites();

    // search
    const search = this.searchControl.value?.toLowerCase() ?? '';
    if (search) {
      toys = toys.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
      );
    }

    // sort
    const sortKey = this.sortControl.value ?? 'name';
    toys = [...toys].sort((a, b) => {
      const dir = this.sortDirectionControl.value === 'rast' ? 1 : -1;
      let aVal: any = (a as any)[sortKey];
      let bVal: any = (b as any)[sortKey];

      // handle nested keys like type.name or ageGroup.name
      if (sortKey.includes('.')) {
        const [outer, inner] = sortKey.split('.');
        aVal = (a as any)[outer]?.[inner];
        bVal = (b as any)[outer]?.[inner];
      }

      if (aVal == null) return -1 * dir;
      if (bVal == null) return 1 * dir;
      return aVal > bVal ? dir : aVal < bVal ? -dir : 0;
    });

    return toys;
  }

  toggleSortDirection(): void {
    this.sortDirectionControl.setValue(
      this.sortDirectionControl.value === 'rast' ? 'opad' : 'rast'
    );
  }

  addToCart(toy: ToyModel): void {
    this.cartService.addItem(toy);
  }

  toggleFavorites(toy: ToyModel): void {
    this.favoriteService.toggleFavorite(toy);
    this.favorites = this.favoriteService.getFavorites(); // refresh
  }

  isFavorite(toy: ToyModel): boolean {
    return this.favoriteService.isFavorite(toy.toyId);
  }
}
