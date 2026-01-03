import axios from 'axios'
import { Component, OnInit, ViewEncapsulation, signal, computed } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSliderModule } from '@angular/material/slider'
import { MatSelectModule } from '@angular/material/select'
import { MatInputModule } from '@angular/material/input'
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio'
import { MatChipsModule } from '@angular/material/chips'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'

import { ToyModel } from '../models/toy.model'
import { TypeModel } from '../models/type.model'
import { CartService } from '../cart/cart.service'
import { ReviewService } from '../services/review.service'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'

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
    MatRadioGroup,
    MatRadioButton,
    MatChipsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './shop.html',
  styleUrl: './shop.css',
  encapsulation: ViewEncapsulation.None
})
export class Shop implements OnInit {
  types = signal<TypeModel[]>([])
  toys = signal<ToyWithRating[]>([])
  filteredToys = signal<ToyWithRating[]>([])

  showTypes = false
  showAgeGroups = false
  showPriceRange = false
  showGender = false

  typeControl = new FormControl<TypeModel[]>([])
  genderControl = new FormControl<string>('svi')
  ageGroupControl = new FormControl<string[]>([])
  minPriceControl = new FormControl<number | null>(null)
  maxPriceControl = new FormControl<number | null>(null)
  searchControl = new FormControl<string>('')
  sortControl = new FormControl<string>('name')
  sortDirectionControl = new FormControl<'rast' | 'opad'>('rast')

  constructor(
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private reviewService: ReviewService
  ) { }

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

    this.typeControl.valueChanges.subscribe(() => this.applyFilters())
    this.genderControl.valueChanges.subscribe(() => this.applyFilters())
    this.ageGroupControl.valueChanges.subscribe(() => this.applyFilters())
    this.minPriceControl.valueChanges.subscribe(() => this.applyFilters())
    this.maxPriceControl.valueChanges.subscribe(() => this.applyFilters())
    this.searchControl.valueChanges.subscribe(() => this.applyFilters())
    this.sortControl.valueChanges.subscribe(() => this.applyFilters())
  }

  private loadTypes() {
    axios.get('https://toy.pequla.com/api/type')
      .then(res => {
        this.types.set(res.data)
      })
  }

  private async loadToys() {
    try {
      const res = await axios.get('https://toy.pequla.com/api/toy')
      const toysWithImages = res.data.map((toy: ToyModel) => ({
        ...toy,
        imageUrl: `https://toy.pequla.com/img/${toy.toyId}.png`,
        avgRating: 0,
        reviewCount: 0
      }))

      // Load ratings for all toys
      const toysWithRatings: ToyWithRating[] = await Promise.all(
        toysWithImages.map(async (toy: ToyWithRating) => {
          const reviews = await this.reviewService.getReviewsForToy(toy.toyId)
          const avgRating = reviews.length > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
            : 0
          return { ...toy, avgRating, reviewCount: reviews.length }
        })
      )

      this.toys.set(toysWithRatings)
      this.filteredToys.set(toysWithRatings)
      // Apply filters after toys are loaded (for URL params)
      this.applyFilters()
    } catch (error) {
      console.error('Error loading toys:', error)
    }
  }

  applyFilters() {
    const selectedTypes = this.typeControl.value || []
    const selectedTypeIds = selectedTypes.map(t => t.typeId)

    const selectedGender = this.genderControl.value
    const selectedAges = this.ageGroupControl.value || []

    const minPrice = this.minPriceControl.value
    const maxPrice = this.maxPriceControl.value

    const searchTerm = (this.searchControl.value || '').toLowerCase()

    let result = this.toys().filter(toy => {
      const matchesType = selectedTypeIds.length === 0 || (toy.type && selectedTypeIds.includes(toy.type.typeId))
      const matchesGender = selectedGender === 'svi' || toy.targetGroup === selectedGender
      const matchesAge = selectedAges.length === 0 || (toy.ageGroup && selectedAges.includes(toy.ageGroup.name))
      const matchesMinPrice = minPrice == null || toy.price >= minPrice
      const matchesMaxPrice = maxPrice == null || toy.price <= maxPrice
      const matchesSearch = toy.name.toLowerCase().includes(searchTerm)

      return matchesType && matchesGender && matchesAge && matchesMinPrice && matchesMaxPrice && matchesSearch
    })

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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  toggleSortDirection() {
    const current = this.sortDirectionControl.value
    this.sortDirectionControl.setValue(current === 'rast' ? 'opad' : 'rast')
    this.applyFilters()
  }

  resetFilters() {
    this.typeControl.setValue([])
    this.genderControl.setValue('svi')
    this.ageGroupControl.setValue([])
    this.minPriceControl.setValue(null)
    this.maxPriceControl.setValue(null)

    this.filteredToys.set(this.toys())
  }

  addToCart(toy: ToyModel) {
    this.cartService.addItem(toy)
    this.snackBar.open(`${toy.name} added to cart!`, 'Close', {
      duration: 2500,
      horizontalPosition: 'left',
      verticalPosition: 'bottom'
    })
  }

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
}
