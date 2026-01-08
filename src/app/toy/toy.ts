import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
    RouterLink
  ],
  templateUrl: './toy.html',
  styleUrl: './toy.css'
})
export class Toy implements OnInit {
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
  hasUserReviewed = signal(false);
  toyOrderStatus = signal<'not-ordered' | 'rezervisano' | 'pristiglo' | 'otkazano'>('not-ordered');

  stars = [1, 2, 3, 4, 5];

  // Can review if: logged in, has 'pristiglo' status, hasn't reviewed yet
  canReview = computed(() => {
    return this.toyOrderStatus() === 'pristiglo' && !this.hasUserReviewed();
  });

  averageRating = computed(() => {
    const r = this.reviews();
    if (r.length === 0) return 0;
    const sum = r.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / r.length) * 10) / 10;
  });

  reviewCount = computed(() => this.reviews().length);

  private reviewService = inject(ReviewService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadToy(parseInt(id));
      this.loadReviews(parseInt(id));
    } else {
      this.error.set('ID igračke nije pronađen');
      this.loading.set(false);
    }
  }

  private loadToy(id: number) {
    axios.get(`https://toy.pequla.com/api/toy/${id}`)
      .then(res => {
        const toyData = {
          ...res.data,
          imageUrl: `https://toy.pequla.com/img/${res.data.toyId}.png`
        };
        this.toy.set(toyData);
        this.loading.set(false);
      })
      .catch(err => {
        this.error.set('Greška pri učitavanju igračke');
        this.loading.set(false);
      });
  }

  private async loadReviews(toyId: number) {
    this.loadingReviews.set(true);
    try {
      const reviews = await this.reviewService.getReviewsForToy(toyId);
      this.reviews.set(reviews);

      // Check if current user has already reviewed and order status
      const user = this.authService.currentUser();
      if (user) {
        const userName = `${user.name} ${user.surname?.charAt(0)}.`;
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

  setRating(rating: number) {
    this.userRating.set(rating);
  }

  setHoverRating(rating: number) {
    this.hoverRating.set(rating);
  }

  clearHoverRating() {
    this.hoverRating.set(0);
  }

  getStarClass(star: number): string {
    const displayRating = this.hoverRating() || this.userRating();
    return star <= displayRating ? 'filled' : 'empty';
  }

  getReviewStarClass(star: number, rating: number): string {
    return star <= rating ? 'filled' : 'empty';
  }

  submitReview() {
    const user = this.authService.currentUser();

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

    const userName = `${user.name} ${user.surname?.charAt(0)}.`;
    const newReview = this.reviewService.addReview({
      toyId: toy.toyId,
      userName,
      rating: this.userRating(),
      comment: this.userComment()
    });

    this.reviews.update(reviews => [newReview, ...reviews]);
    this.userRating.set(0);
    this.userComment.set('');
    this.submittingReview.set(false);
    this.hasUserReviewed.set(true);

    this.snackBar.open('Hvala na recenziji!', 'OK', {
      duration: 3000
    });
  }

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
