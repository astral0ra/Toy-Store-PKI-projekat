import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { TypeModel } from '../models/type.model';
import { Router } from '@angular/router';
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
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.currentUser;
  saving = signal(false);
  errorMsg = signal<string | null>(null);
  okMsg = signal<string | null>(null);
  loadingTypes = signal(true);
  types = signal<TypeModel[]>([]);

  // Form with prefilled values
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    surname: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    city: ['', [Validators.required, Validators.maxLength(60)]],
    address: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.maxLength(30)]],
    favouriteTypes: [[] as number[]]
  });

  get f() { return this.form.controls; }

  async ngOnInit() {
    const u = this.user();
    if (!u) {
      this.router.navigate(['/login']);
      return;
    }

    // Prefill the form with user data
    this.form.patchValue({
      name: u.name,
      surname: u.surname,
      email: u.email,
      city: u.city || '',
      address: u.address || '',
      phone: u.phone || '',
      favouriteTypes: u.favouriteTypes || []
    });

    // Load all types for the dropdown
    try {
      const res = await axios.get('https://toy.pequla.com/api/type');
      this.types.set(res.data);
    } catch (err) {
      console.error('Failed to load types:', err);
    } finally {
      this.loadingTypes.set(false);
    }
  }

  save() {
    this.errorMsg.set(null);
    this.okMsg.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      const patch: Partial<User> = {
        name: v.name!,
        surname: v.surname!,
        email: v.email!,
        city: v.city || '',
        address: v.address || '',
        phone: v.phone || '',
        favouriteTypes: v.favouriteTypes || []
      };

      this.auth.updateProfile(patch);
      this.okMsg.set('Podaci su uspešno sačuvani.');
    } catch (e: any) {
      this.errorMsg.set(e?.message || 'Greška pri čuvanju podataka.');
    } finally {
      this.saving.set(false);
    }
  }

  goToChangePassword() {
    this.router.navigate(['/change-password']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
