import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, ɵEmptyOutletComponent } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import axios from 'axios';

import { ToyModel } from '../models/toy.model';
import { Review } from '../models/review.model';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ReviewService } from '../services/review.service';

@Component({
  selector: 'app-toy',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    FormsModule,
    RouterLink,
    ɵEmptyOutletComponent
],
  templateUrl: './toy.html',
  styleUrl: './toy.css'
})
export class Toy implements OnInit {
  // The loaded toy object from API (or null if not loaded)
  toy = signal<ToyModel | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Reviews
  reviews = signal<Review[]>([]);
  userRating = signal(0);
  hoverRating = signal(0);
  userComment = signal('');
  submittingReview = signal(false);
  loadingReviews = signal(true);
  hasUserReviewed = signal(false); // Prevetnts duplicate reviews
  // Order status used to restrict reviews (must be 'pristiglo' to review)
  toyOrderStatus = signal<'not-ordered' | 'rezervisano' | 'pristiglo' | 'otkazano'>('not-ordered');

  // List used to render 5 star buttons in template
  stars = [1, 2, 3, 4, 5];

  // Can review if: logged in, has 'pristiglo' status, hasn't been reviewed yet
  canReview = computed(() => {
    return this.toyOrderStatus() === 'pristiglo' && !this.hasUserReviewed();
  });
  //Calculates avg rating from all reviews
  averageRating = computed(() => {
    const r = this.reviews();
    if (r.length === 0) return 0;
    const sum = r.reduce((acc, review) => acc + review.rating, 0); // Iteration over all reviews and adds together their rating values tto calculate the total sum of ratings
  // Rounded to 1 decimal
    return Math.round((sum / r.length) * 10) / 10;
  });

  // Computed number of reviews
  reviewCount = computed(() => this.reviews().length);

  private reviewService = inject(ReviewService);

  constructor(
private route: ActivatedRoute, // gets /toy/:id param
    private router: Router,        // navigation (go back)
    private cartService: CartService, // add to cart + get order status
    private snackBar: MatSnackBar, // toast messages
    public authService: AuthService // public so template can read login status
  
  ) {}

  // Runs when components loads
  ngOnInit() {
  // Read the ID route parametar from URL
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadToy(parseInt(id));
      this.loadReviews(parseInt(id));
    } else {
      this.error.set('ID igračke nije pronađen');
      this.loading.set(false);
    }
  }

  // Loads toy data from API
  private loadToy(id: number) {
    axios.get(`https://toy.pequla.com/api/toy/${id}`)
      .then(res => {
  // Add image URL based on toyId (API returns toy fields but not full image url)
        const toyData = {
          ...res.data,
          imageUrl: `https://toy.pequla.com/img/${res.data.toyId}.png`
        };
        this.toy.set(toyData);
        this.loading.set(false);
      })
      .catch(err => {
  // If API fails, show error message
        this.error.set('Greška pri učitavanju igračke');
        this.loading.set(false);
      });
  }
  // Loads reviews and also checks if the current user can review
  private async loadReviews(toyId: number) {
    this.loadingReviews.set(true);
    try {
  // Fetch reviews from ReviewService (local storage / local data)
      const reviews = await this.reviewService.getReviewsForToy(toyId);
      this.reviews.set(reviews);

      // Check if current user has already reviewed and order status
      const user = this.authService.currentUser();
      if (user) {
        const userName = `${user.name} ${user.surname?.charAt(0)}.`;
      // Check if they already review this toy  
      const hasReviewed = await this.reviewService.hasUserReviewed(toyId, userName);
        this.hasUserReviewed.set(hasReviewed);

        // Check order status for this toy
        const orderStatus = this.cartService.getToyOrderStatus(toyId);
        this.toyOrderStatus.set(orderStatus);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      this.loadingReviews.set(false);
    }
  }
// UI helpers for star rating interactions
  setRating(rating: number) {
    this.userRating.set(rating);
  }

  setHoverRating(rating: number) {
    this.hoverRating.set(rating);
  }

  clearHoverRating() {
    this.hoverRating.set(0);
  }
  // Returns a CSS class name for star display (filled vs empty)
  getStarClass(star: number): string {
    const displayRating = this.hoverRating() || this.userRating();
    return star <= displayRating ? 'filled' : 'empty';
  }
  // For displaying stars inside an existing review
  getReviewStarClass(star: number, rating: number): string {
    return star <= rating ? 'filled' : 'empty';
  }
  //Submits a new review
  submitReview() {
    const user = this.authService.currentUser();
  // Must be logged in  
    if (!user) {
      this.snackBar.open('Morate biti prijavljeni da biste ostavili recenziju', 'OK', {
        duration: 3000
      });
      return;
    }

    // Check order status
    if (this.toyOrderStatus() !== 'pristiglo') {
      this.snackBar.open('Morate primiti igračku pre ostavljanja recenzije', 'OK', {
        duration: 3000
      });
      return;
    }

    if (this.hasUserReviewed()) {
      this.snackBar.open('Već ste ostavili recenziju za ovu igračku', 'OK', {
        duration: 3000
      });
      return;
    }

    if (this.userRating() === 0) {
      this.snackBar.open('Molimo odaberite ocenu', 'OK', {
        duration: 3000
      });
      return;
    }

    const toy = this.toy();
    if (!toy) return;

    this.submittingReview.set(true);
  // Create the userName key again
    const userName = `${user.name} ${user.surname?.charAt(0)}.`;

  // Add review to ReviewService storage
    const newReview = this.reviewService.addReview({
      toyId: toy.toyId,
      userName,
      rating: this.userRating(),
      comment: this.userComment()
    });
    // Update local UI list immediately
    this.reviews.update(reviews => [newReview, ...reviews]);

    //Reset UI inputs
    this.userRating.set(0);
    this.userComment.set('');
    this.submittingReview.set(false);
    this.hasUserReviewed.set(true);

    //Success
    this.snackBar.open('Hvala na recenziji!', 'OK', {
      duration: 3000
    });
  }
  //Add the toy to cart using CartService
  addToCart() {
    const t = this.toy();
    if (t) {
      this.cartService.addItem(t);
      this.snackBar.open(`${t.name} dodato u korpu!`, 'OK', {
        duration: 2500,
        horizontalPosition: 'left',
        verticalPosition: 'bottom'
      });
    }
  }

  goBack() {
    this.router.navigate(['/shop']);
  }
}
