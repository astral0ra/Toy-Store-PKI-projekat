import { Injectable, signal } from "@angular/core";
import { ToyModel } from "../models/toy.model";

@Injectable({providedIn: 'root'})
export class FavoriteToysService {
   private readonly FAVORITE_TOYS_KEY = 'favorite-toys'
   
   private favorites = signal<ToyModel[]>([])

   constructor() {
    this.loadFavorites();
   }

   private loadFavorites(): void {
    const saved = localStorage.getItem(this.FAVORITE_TOYS_KEY)
    if (saved) {
        this.favorites.set(JSON.parse(saved))
    }
   }

   private saveFavorites(): void {
    localStorage.setItem(this.FAVORITE_TOYS_KEY, JSON.stringify(this.favorites()))
   }

   addFavorite(toy: ToyModel): void {
    if(!this.isFavorite(toy.toyId)){
        this.favorites.update(items => [...items, toy])
        this.saveFavorites()
    }
   }

   removeFavorite(toyId: number){
    this.favorites.update(items => items.filter(t => t.toyId !== toyId))
    this.saveFavorites()
   }

   toggleFavorite(toy: ToyModel): void {
    if (this.isFavorite(toy.toyId)) {
        this.removeFavorite(toy.toyId)
    } else {
        this.addFavorite(toy);
    }
   }

   isFavorite(toyId: number): boolean {
    return this.favorites().some(t=> t.toyId === toyId)
   }

   getFavorites(): ToyModel[] {
    return this.favorites()
   }
}