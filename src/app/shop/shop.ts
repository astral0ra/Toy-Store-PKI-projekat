import axios from 'axios'
import { Component, OnInit, ViewEncapsulation, signal, computed } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSliderModule } from '@angular/material/slider'
import { MatSelectModule } from '@angular/material/select'
import { MatInputModule } from '@angular/material/input'
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { LoginWarningDialog } from '../login-warning-dialog/login-warning-dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ToyModel } from '../models/toy.model'
import { TypeModel } from '../models/type.model'
import { CartService } from '../services/cart.service'
import { ReviewService } from '../services/review.service'
import { FavoriteToysService } from '../services/favorite-toys.service'
import {AuthService} from '../services/auth.service'

interface ToyWithRating extends ToyModel {
  avgRating: number
  reviewCount: number
}

@Component({
  selector: 'app-shop',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSliderModule,
    MatSelectModule,
    MatInputModule,
    MatRadioModule,
    MatChipsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    RouterLink,
    MatDialogModule
  ],
  templateUrl: './shop.html',
  styleUrl: './shop.css',

  // Disables style scoping, so CSS can affect nested Material elements
  encapsulation: ViewEncapsulation.None
})
export class Shop implements OnInit {
  // Signals store state in a reactive way
  // types = all type options for filtering
  types = signal<TypeModel[]>([])
  // full list loaded from API
  toys = signal<ToyWithRating[]>([])
  //list after filters/sorts applied
  filteredToys = signal<ToyWithRating[]>([])

  // Flags to show/hide filter section in UI
  showTypes = false
  showAgeGroups = false
  showPriceRange = false
  showGender = false

  // Form controls for filters/sorting
  typeControl = new FormControl<TypeModel[]>([])
  genderControl = new FormControl<string>('svi')
  ageGroupControl = new FormControl<string[]>([])
  minPriceControl = new FormControl<number | null>(null)
  maxPriceControl = new FormControl<number | null>(null)
  searchControl = new FormControl<string>('')
  sortControl = new FormControl<string>('name')
  sortDirectionControl = new FormControl<'rast' | 'opad'>('rast')

  //Services injected via constructor
  constructor(
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private reviewService: ReviewService,
    private favoriteService: FavoriteToysService,
    public auth: AuthService,
    private dialog: MatDialog
  ) { }

  //load filter options and toy list from API
  ngOnInit() {
    this.loadTypes()
    this.loadToys()

    // Read age filter from query params
    this.route.queryParams.subscribe(params => {
      const ageParam = params['age']
      if (ageParam) {
        this.ageGroupControl.setValue([ageParam])
        this.showAgeGroups = true
      }
    })
    // Re-apply filters whenever any filter/sort input changes
    this.typeControl.valueChanges.subscribe(() => this.applyFilters())
    this.genderControl.valueChanges.subscribe(() => this.applyFilters())
    this.ageGroupControl.valueChanges.subscribe(() => this.applyFilters())
    this.minPriceControl.valueChanges.subscribe(() => this.applyFilters())
    this.maxPriceControl.valueChanges.subscribe(() => this.applyFilters())
    this.searchControl.valueChanges.subscribe(() => this.applyFilters())
    this.sortControl.valueChanges.subscribe(() => this.applyFilters())
  }
    // Re-apply filters whenever any filter/sort input changes
  private loadTypes() {
    axios.get('https://toy.pequla.com/api/type')
      .then(res => {
        this.types.set(res.data)
      })
  }
  // Loads toys, adds image URL, then calculates rating for each toy
  private async loadToys() {
    try {
      const res = await axios.get('https://toy.pequla.com/api/toy')
      const toysWithImages = res.data.map((toy: ToyModel) => ({
        ...toy,
        imageUrl: `https://toy.pequla.com/img/${toy.toyId}.png`,
        avgRating: 0,
        reviewCount: 0
      }))

      // Load ratings for all toys and compute avg rating
      const toysWithRatings: ToyWithRating[] = await Promise.all(
        toysWithImages.map(async (toy: ToyWithRating) => {
          const reviews = await this.reviewService.getReviewsForToy(toy.toyId)
          const avgRating = reviews.length > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
            : 0
          return { ...toy, avgRating, reviewCount: reviews.length }
        })
      )

    // Save full list and initial filtered list
      this.toys.set(toysWithRatings)
      this.filteredToys.set(toysWithRatings)
      // Apply filters after toys are loaded (for URL params)
      this.applyFilters()
    } catch (error) {
      console.error('Error loading toys:', error)
    }
  }
  // Applies all filters and sorting to the full toy list, updates filteredToys
  applyFilters() {
    const selectedTypes = this.typeControl.value || []
    const selectedTypeIds = selectedTypes.map(t => t.typeId)

    const selectedGender = this.genderControl.value
    const selectedAges = this.ageGroupControl.value || []

    const minPrice = this.minPriceControl.value
    const maxPrice = this.maxPriceControl.value

    const searchTerm = (this.searchControl.value || '').toLowerCase()

    // Filter: only keep toys matching every active filter
    let result = this.toys().filter(toy => {
      const matchesType = selectedTypeIds.length === 0 || (toy.type && selectedTypeIds.includes(toy.type.typeId))
      const matchesGender = selectedGender === 'svi' || toy.targetGroup === selectedGender
      const matchesAge = selectedAges.length === 0 || (toy.ageGroup && selectedAges.includes(toy.ageGroup.name))
      const matchesMinPrice = minPrice == null || toy.price >= minPrice
      const matchesMaxPrice = maxPrice == null || toy.price <= maxPrice
      const matchesSearch = toy.name.toLowerCase().includes(searchTerm)

      return matchesType && matchesGender && matchesAge && matchesMinPrice && matchesMaxPrice && matchesSearch
    })

    // Sorting
    const sortItem = this.sortControl.value
    const sortDir = this.sortDirectionControl.value

    if (sortItem) {
      result.sort((a, b) => {
        const valA = this.getNestedValue(a, sortItem)
        const valB = this.getNestedValue(b, sortItem)

        if (valA < valB) return sortDir === 'rast' ? -1 : 1
        if (valA > valB) return sortDir === 'rast' ? 1 : -1

        return 0
      })
    }

    this.filteredToys.set(result)
  }

  // Allows sorting by nested fields like "type.name" by following the path
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Toggles between ascending (rast) and descending (opad)
  toggleSortDirection() {
    const current = this.sortDirectionControl.value
    this.sortDirectionControl.setValue(current === 'rast' ? 'opad' : 'rast')
    this.applyFilters()
  }
  // Resets filters back to defaults
  resetFilters() {
    this.typeControl.setValue([])
    this.genderControl.setValue('svi')
    this.ageGroupControl.setValue([])
    this.minPriceControl.setValue(null)
    this.maxPriceControl.setValue(null)

    this.filteredToys.set(this.toys())
  }
  // Adds a toy to cart and shows a Snackbar confirmation
  addToCart(toy: ToyModel) {
    if(!this.auth.isLoggedIn()){
      this.dialog.open(LoginWarningDialog, {
        data: { action: 'dodali u korpu' }
      });
    } else {
      this.cartService.addItem(toy)
      this.snackBar.open(`${toy.name} dodato u korpu!`, 'Close', {
        duration: 2500,
        horizontalPosition: 'left',
        verticalPosition: 'bottom'
      })
    }
  }

  // Converts numeric rating into a list of icon names for star display
  getStars(rating: number): string[] {
    const stars: string[] = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating - fullStars >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push('star')
    }
    if (hasHalfStar) {
      stars.push('star_half')
    }
    while (stars.length < 5) {
      stars.push('star_border')
    }
    return stars
  }

  toggleFavorites(toy: ToyModel): void {
    if(!this.auth.isLoggedIn()){
      this.dialog.open(LoginWarningDialog, {
        data: { action: 'dodali u omiljene' }
      });
    } else {
      this.favoriteService.toggleFavorite(toy)
    }
  }

  isFavorite(toy: ToyModel): boolean {
    return this.favoriteService.isFavorite(toy.toyId)
  }
}
