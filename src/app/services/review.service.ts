import { Injectable } from '@angular/core';
import { Review } from '../models/review.model';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private seedReviews: Review[] = [];
  private userReviews: Review[] = [];
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  private readonly STORAGE_KEY = 'user-reviews';

  constructor() {
    this.loadUserReviews();
  }

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

  private saveUserReviews(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userReviews));
    } catch (e) {
      console.error('Failed to save user reviews to localStorage:', e);
    }
  }

  async loadSeedReviews(): Promise<void> {
    if (this.loaded) return;

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

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
        this.loaded = true;
      });

    return this.loadingPromise;
  }

  async getReviewsForToy(toyId: number): Promise<Review[]> {
    await this.loadSeedReviews();

    const allReviews = [...this.seedReviews, ...this.userReviews];
    return allReviews
      .filter(r => r.toyId === toyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getAllReviews(): Promise<Review[]> {
    await this.loadSeedReviews();
    return [...this.seedReviews, ...this.userReviews];
  }

  addReview(review: Omit<Review, 'id' | 'date'>): Review {
    const newReview: Review = {
      ...review,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };

    this.userReviews.push(newReview);
    this.saveUserReviews();

    return newReview;
  }

  async getAverageRating(toyId: number): Promise<number> {
    const reviews = await this.getReviewsForToy(toyId);
    if (reviews.length === 0) return 0;

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  async getTopRatedToyIds(limit: number = 5): Promise<{ toyId: number; avgRating: number; reviewCount: number }[]> {
    await this.loadSeedReviews();

    const allReviews = [...this.seedReviews, ...this.userReviews];
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
      .filter(t => t.reviewCount >= 3) // Only toys with 3+ reviews
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, limit);
  }

  async hasUserReviewed(toyId: number, userName: string): Promise<boolean> {
    await this.loadSeedReviews();
    const allReviews = [...this.seedReviews, ...this.userReviews];
    return allReviews.some(r => r.toyId === toyId && r.userName.toLowerCase() === userName.toLowerCase());
  }

  async getReviewCount(toyId: number): Promise<number> {
    const reviews = await this.getReviewsForToy(toyId);
    return reviews.length;
  }
}
