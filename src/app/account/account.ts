// Angular core utilities:
import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
// Angular Material UI modules used in the template
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// Services and models
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { TypeModel } from '../models/type.model';
// Router - navigating between pages
import { Router } from '@angular/router';
// Axios for fetching toy types from external API
import axios from 'axios';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class Account implements OnInit {
  // Dependency injection:
  private fb = inject(FormBuilder); // FormBuilder creates the form object
  private auth = inject(AuthService); // handles reading and updating user in localStorage
  private router = inject(Router); //redirecting

  user = this.auth.currentUser;
  saving = signal(false);
  errorMsg = signal<string | null>(null);
  okMsg = signal<string | null>(null);
  loadingTypes = signal(true);
  types = signal<TypeModel[]>([]);

  // Reactive form definition
  // Holds all editable account fields
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    surname: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    city: ['', [Validators.required, Validators.maxLength(60)]],
    address: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.maxLength(11)]],
    favouriteTypes: [[] as number[]] //stores selected type IDs from the multiselect AS NUMBER
  });


  get f() { return this.form.controls; }
  // Runs once when component loads
  async ngOnInit() {
    // Read current user from AuthService signal
    const u = this.user();
    // If user is not logged in, redirect to login page
    if (!u) {
      this.router.navigate(['/login']);
      return;
    }

    // Prefill the form with existing user data
    // patchValue sets only the listed fields
    this.form.patchValue({
      name: u.name,
      surname: u.surname,
      email: u.email,
      city: u.city || '',
      address: u.address || '',
      phone: u.phone || '',
      favouriteTypes: u.favouriteTypes || []
    });

    // Load types from API for the multiselect dropdown
    try {
      const res = await axios.get('https://toy.pequla.com/api/type');
      this.types.set(res.data);
    } catch (err) {
      console.error('Failed to load types:', err);
    } finally {
      this.loadingTypes.set(false);
    }
  }

  // Called when the form is submitted
  save() {
    this.errorMsg.set(null);
    this.okMsg.set(null);

    // If invalid, validation message appears
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true); // turn on saving state
    try {
      //  Get values from the form (includes disabled controls if any)
      const v = this.form.getRawValue();

      // Build an update object    
      const patch: Partial<User> = {
        name: v.name!,
        surname: v.surname!,
        email: v.email!,
        city: v.city || '',
        address: v.address || '',
        phone: v.phone || '',
        favouriteTypes: v.favouriteTypes || []
      };

      // Save update to localStorage
      this.auth.updateProfile(patch);
      this.okMsg.set('Podaci su uspešno sačuvani.');
    } catch (e: any) {
      this.errorMsg.set(e?.message || 'Greška pri čuvanju podataka.');
    } finally {
      // Turn off saving state
      this.saving.set(false);
    }
  }

  // Password changing route
  goToChangePassword() {
    this.router.navigate(['/change-password']);
  }
  // Logout user and send them to the log in page
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
