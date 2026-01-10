import { Component, inject, signal, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import axios from "axios";
import { ToyModel } from '../models/toy.model';
import { ReviewService } from '../services/review.service';

// Local interface, extends ToyModel and adds rating info we need only on the home page
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
// Inject services we need:
// ReviewService for top rated IDs, Router to navigate to other pages
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  // List of top toys (with rating data) used by carousel
  topToys = signal<TopToy[]>([]);

  // List of top toys (with rating data) used by carousel
  currentIndex = signal(0);

  // Loading flag to display loading UI while we fetch data
  loading = signal(true);

  // Navigates to /shop with query param age=... so shop page can filter
  filterByAge(ageGroup: string) {
    if (ageGroup) {
      this.router.navigate(['/shop'], { queryParams: { age: ageGroup } });
    } else {
      this.router.navigate(['/shop']);
    }
  }

 // Runs once when the component loads
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
      //find toy object by id
        const toy = allToys.find(t => t.toyId === rated.toyId);
        if (toy) {
          topToysWithRating.push({
            ...toy,
            //force consistemt image URL based on toyID
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
      // Store final list in signal
      this.topToys.set(topToysWithRating);
    } catch (error) {
      // if API fails, log error
      console.error('Error fetching data:', error);
    } finally {
      //loading stops regardless of success or failure
      this.loading.set(false);
    }
  }
  // Move carousel one step backward (wrap around using modulo)
  prevSlide() {
    const toys = this.topToys();
    if (toys.length === 0) return;
    this.currentIndex.set((this.currentIndex() - 1 + toys.length) % toys.length);
  }

  // Move carousel one step forward (wrap around using modulo)
  nextSlide() {
    const toys = this.topToys();
    if (toys.length === 0) return;
    this.currentIndex.set((this.currentIndex() + 1) % toys.length);
  }

  // Converts number (of the rating) into 5 Angular material stars
  getStars(rating: number): string[] { // function that accepts a number rating and returns an array of strings (icon names)
    const stars: string[] = []; // empty array that will hold icon names / ex. final value: 'star', 'star', 'star_half', 'star_border', 'star_border'
    const fullStars = Math.floor(rating); // only takes the whole number = how many full stars
    const hasHalfStar = rating - fullStars >= 0.5; // checks if the decimal part is at least 0.5

  // Adds one start string per full start
    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }
  //Adds one half star only if needed + maximum 1 half star allowed
    if (hasHalfStar) {
      stars.push('star_half');
    }
  // Fills the remaining slots with empty stars
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
    const count = Math.min(4, toys.length);

    for (let i = 0; i < count; i++) {
      const index = (this.currentIndex() + i) % toys.length;
      result.push(toys[index]);
    }

    return result;
  }
}
