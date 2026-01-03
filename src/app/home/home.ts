import { Component, inject, signal, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import axios from "axios";
import { ToyModel } from '../models/toy.model';
import { ReviewService } from '../services/review.service';

interface TopToy extends ToyModel {
  avgRating: number;
  reviewCount: number;
}

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  topToys = signal<TopToy[]>([]);
  currentIndex = signal(0);
  loading = signal(true);

  filterByAge(ageGroup: string) {
    if (ageGroup) {
      this.router.navigate(['/shop'], { queryParams: { age: ageGroup } });
    } else {
      this.router.navigate(['/shop']);
    }
  }

  async ngOnInit() {
    try {
      // Load all toys from API
      const toysResponse = await axios.get<ToyModel[]>('https://toy.pequla.com/api/toy');
      const allToys = toysResponse.data;

      // Get top rated toy IDs from review service
      const topRated = await this.reviewService.getTopRatedToyIds(10);

      // Match top rated IDs with full toy data
      const topToysWithRating: TopToy[] = [];

      for (const rated of topRated) {
        const toy = allToys.find(t => t.toyId === rated.toyId);
        if (toy) {
          topToysWithRating.push({
            ...toy,
            imageUrl: `https://toy.pequla.com/img/${toy.toyId}.png`,
            avgRating: rated.avgRating,
            reviewCount: rated.reviewCount
          });
        }
      }

      // If we have fewer than 4 top rated toys, add some toys without reviews
      if (topToysWithRating.length < 4) {
        const existingIds = new Set(topToysWithRating.map(t => t.toyId));
        for (const toy of allToys) {
          if (!existingIds.has(toy.toyId) && topToysWithRating.length < 4) {
            topToysWithRating.push({
              ...toy,
              imageUrl: `https://toy.pequla.com/img/${toy.toyId}.png`,
              avgRating: 0,
              reviewCount: 0
            });
          }
        }
      }

      this.topToys.set(topToysWithRating);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  prevSlide() {
    const toys = this.topToys();
    if (toys.length === 0) return;
    this.currentIndex.set((this.currentIndex() - 1 + toys.length) % toys.length);
  }

  nextSlide() {
    const toys = this.topToys();
    if (toys.length === 0) return;
    this.currentIndex.set((this.currentIndex() + 1) % toys.length);
  }

  getStars(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }
    if (hasHalfStar) {
      stars.push('star_half');
    }
    while (stars.length < 5) {
      stars.push('star_border');
    }
    return stars;
  }

  // Get visible toys for carousel (up to 3 at a time)
  get visibleToys(): TopToy[] {
    const toys = this.topToys();
    if (toys.length === 0) return [];

    const result: TopToy[] = [];
    const count = Math.min(3, toys.length);

    for (let i = 0; i < count; i++) {
      const index = (this.currentIndex() + i) % toys.length;
      result.push(toys[index]);
    }

    return result;
  }
}
