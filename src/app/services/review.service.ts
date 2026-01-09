import { Injectable } from '@angular/core';
import { Review } from '../models/review.model';

/**
 * ReviewService manages two kinds of reviews:
 * 1) seedReviews: pre-made reviews from a JSON file (demo data)
 * 2) userReviews: reviews created by users inside this app, saved in localStorage
 */
@Injectable({
  providedIn: 'root'
})
export class ReviewService {

  // Seed data loaded once from /assets/seed-reviews.json
  private seedReviews: Review[] = [];

  // User-created reviews stored in localStorage
  private userReviews: Review[] = [];

  // Flags to prevent loading the seed file multiple times
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  // localStorage key for user reviews
  private readonly STORAGE_KEY = 'user-reviews';

  constructor() {
    // Load user reviews immediately when the service is created
    this.loadUserReviews();
  }

  /**
   * Loads user-created reviews from localStorage into memory.
   * If parsing fails, reset to [].
   */
  private loadUserReviews(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.userReviews = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load user reviews from localStorage:', e);
      this.userReviews = [];
    }
  }

  /**
   * Saves userReviews back into localStorage so they persist after refresh.
   */
  private saveUserReviews(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userReviews));
    } catch (e) {
      console.error('Failed to save user reviews to localStorage:', e);
    }
  }

  /**
   * Loads seed reviews exactly once.
   * Uses loadingPromise so multiple calls share the same request.
   */
  async loadSeedReviews(): Promise<void> {
    // If already loaded, do nothing
    if (this.loaded) return;

    // If currently loading, return the same promise instead of starting a new fetch
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading and store the promise so others can reuse it
    this.loadingPromise = fetch('/assets/seed-reviews.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load seed reviews');
        }
        return response.json();
      })
      .then((data: Review[]) => {
        this.seedReviews = data;
        this.loaded = true;
      })
      .catch(err => {
        console.error('Error loading seed reviews:', err);
        this.seedReviews = [];
        // Mark as loaded even on failure so we do not retry forever
        this.loaded = true;
      });

    return this.loadingPromise;
  }

  /**
   * Returns all reviews for a toy (seed + user reviews), sorted newest first.
   */
  async getReviewsForToy(toyId: number): Promise<Review[]> {
    await this.loadSeedReviews();

    const allReviews = [...this.seedReviews, ...this.userReviews];
    return allReviews
      .filter(r => r.toyId === toyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Returns all reviews for all toys (seed + user).
   */
  async getAllReviews(): Promise<Review[]> {
    await this.loadSeedReviews();
    return [...this.seedReviews, ...this.userReviews];
  }

  /**
   * Adds a new user review.
   * Omit<Review, 'id' | 'date'> means caller does not send id/date,
   * the service generates them automatically.
   */
  addReview(review: Omit<Review, 'id' | 'date'>): Review {
    const newReview: Review = {
      ...review,
      id: Date.now(), // simple unique id
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    };

    this.userReviews.push(newReview);
    this.saveUserReviews();
    return newReview;
  }

  /**
   * Calculates average rating for a toy, rounded to 1 decimal.
   */
  async getAverageRating(toyId: number): Promise<number> {
    const reviews = await this.getReviewsForToy(toyId);
    if (reviews.length === 0) return 0;

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  /**
   * Returns a list of top-rated toys based on reviews.
   * We only include toys with 3+ reviews for fairness.
   */
  async getTopRatedToyIds(
    limit: number = 5
  ): Promise<{ toyId: number; avgRating: number; reviewCount: number }[]> {

    await this.loadSeedReviews();

    const allReviews = [...this.seedReviews, ...this.userReviews];

    // Map toyId -> { sum of ratings, count of ratings }
    const toyStats = new Map<number, { sum: number; count: number }>();

    allReviews.forEach(r => {
      const stats = toyStats.get(r.toyId) || { sum: 0, count: 0 };
      stats.sum += r.rating;
      stats.count++;
      toyStats.set(r.toyId, stats);
    });

    return Array.from(toyStats.entries())
      .map(([toyId, stats]) => ({
        toyId,
        avgRating: Math.round((stats.sum / stats.count) * 10) / 10,
        reviewCount: stats.count
      }))
      .filter(t => t.reviewCount >= 3)
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, limit);
  }

  /**
   * Checks whether a user already left a review for this toy.
   * We compare userName case-insensitively.
   */
  async hasUserReviewed(toyId: number, userName: string): Promise<boolean> {
    await this.loadSeedReviews();
    const allReviews = [...this.seedReviews, ...this.userReviews];
    return allReviews.some(
      r => r.toyId === toyId && r.userName.toLowerCase() === userName.toLowerCase()
    );
  }

  /**
   * Returns how many reviews exist for a toy.
   */
  async getReviewCount(toyId: number): Promise<number> {
    const reviews = await this.getReviewsForToy(toyId);
    return reviews.length;
  }
}
